"""Endpoint REST dedicato alla gestione delle OTP."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg import AsyncConnection
from psycopg.types.json import Jsonb

from ..config import Settings, get_settings
from ..db import get_connection_with_rls
from ..dependencies import AuthenticatedUser, require_scope
from ..schemas import (
    OtpSendRequest,
    OtpSendResponse,
    OtpVerifyRequest,
    OtpVerifyResponse,
)
from ..services.otp_client import OtpServiceClient, OtpServiceError

router = APIRouter(prefix="/otp", tags=["OTP"])


async def _fetch_user_profile(conn: AsyncConnection, user_id: str) -> tuple[str, str | None, str | None]:
    query = """
        SELECT u.email, c.id AS channel_id, c.code AS channel_code
        FROM users u
        LEFT JOIN otp_channels c ON c.id = u.preferred_otp_channel
        WHERE u.id = %s;
    """
    async with conn.cursor() as cur:
        await cur.execute(query, (user_id,))
        row = await cur.fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utente non trovato.")
    record = dict(row)
    return record["email"], record["channel_id"], record["channel_code"]


async def _resolve_channel(conn: AsyncConnection, channel_code: str) -> tuple[str, str]:
    query = """
        SELECT id, code
        FROM otp_channels
        WHERE UPPER(code) = %s AND is_active = TRUE;
    """
    async with conn.cursor() as cur:
        await cur.execute(query, (channel_code.upper(),))
        row = await cur.fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Canale OTP non disponibile o disabilitato.",
        )
    record = dict(row)
    return record["id"], record["code"]


def _hash_otp_code(code: str, user_id: str, secret: str) -> str:
    material = f"{code}:{user_id}:{secret}".encode("utf-8")
    return hashlib.sha256(material).hexdigest()


@router.post(
    "/send",
    response_model=OtpSendResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Invia una OTP sul canale desiderato",
)
async def send_otp(
    payload: OtpSendRequest,
    conn: AsyncConnection = Depends(get_connection_with_rls),
    user: AuthenticatedUser = Depends(require_scope("transactions:write")),
    settings: Settings = Depends(get_settings),
) -> OtpSendResponse:
    """
    Genera una OTP temporanea, la invia tramite il microservizio dedicato e registra un audit.
    """

    if not settings.otp_service_is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servizio OTP non configurato.",
        )

    email, _, preferred_channel_code = await _fetch_user_profile(conn, user.user_id)

    requested_code = (payload.channel_code or "").strip().upper()
    chosen_code = requested_code or (preferred_channel_code or "EMAIL")

    channel_id, channel_code = await _resolve_channel(conn, chosen_code)

    otp_code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at_dt = datetime.now(timezone.utc) + timedelta(seconds=settings.otp_code_ttl_seconds)
    context = (payload.context or "default").strip() or "default"
    dispatch_payload: dict[str, object] = {
        "user_id": user.user_id,
        "channel": channel_code,
        "code": otp_code,
        "expires_at": expires_at_dt.isoformat(),
        "context": context,
    }

    if channel_code == "EMAIL":
        destination = payload.destination or email
        if not destination:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Indirizzo email non disponibile per l'invio OTP.",
            )
        dispatch_payload["email"] = destination
    else:
        destination = payload.destination
        if not destination:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Numero di telefono richiesto per l'invio SMS simulato.",
            )
        dispatch_payload["phone_number"] = destination

    metadata_payload = payload.metadata or {}
    if metadata_payload:
        dispatch_payload["metadata"] = metadata_payload

    client = OtpServiceClient(
        base_url=settings.otp_service_base_url or "",
        timeout_seconds=settings.otp_service_timeout_seconds,
    )

    status_value = "success"
    try:
        await client.dispatch(dispatch_payload)
    except OtpServiceError as exc:
        status_value = "failed"
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO otp_audits (user_id, otp_channel, status)
                VALUES (%s, %s, %s);
                """,
                (user.user_id, channel_id, status_value),
            )
        await conn.commit()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    challenge_id = uuid4()
    code_hash = _hash_otp_code(otp_code, user.user_id, settings.otp_code_secret)
    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO otp_challenges (
                id, user_id, channel_id, destination, context, code_hash, metadata, expires_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
            """,
            (
                str(challenge_id),
                user.user_id,
                channel_id,
                destination,
                context,
                code_hash,
                Jsonb(metadata_payload) if metadata_payload else None,
                expires_at_dt,
            ),
        )
        await cur.execute(
            """
            INSERT INTO otp_audits (user_id, otp_channel, status)
            VALUES (%s, %s, %s);
            """,
            (user.user_id, channel_id, status_value),
        )
    await conn.commit()

    return OtpSendResponse(
        status="sent",
        challenge_id=challenge_id,
        channel_code=channel_code,
        expires_at=expires_at_dt,
    )


@router.post(
    "/verify",
    response_model=OtpVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verifica una OTP precedentemente inviata",
)
async def verify_otp(
    payload: OtpVerifyRequest,
    conn: AsyncConnection = Depends(get_connection_with_rls),
    user: AuthenticatedUser = Depends(require_scope("transactions:write")),
    settings: Settings = Depends(get_settings),
) -> OtpVerifyResponse:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, user_id, channel_id, context, code_hash, expires_at, verified_at, attempts, status
            FROM otp_challenges
            WHERE id = %s AND user_id = %s
            FOR UPDATE;
            """,
            (str(payload.challenge_id), user.user_id),
        )
        row = await cur.fetchone()

    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sfida OTP inesistente.")

    record = dict(row)
    now = datetime.now(timezone.utc)

    if record["verified_at"] is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La sfida OTP è già stata verificata.")
    if now > record["expires_at"]:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE otp_challenges SET status = 'EXPIRED' WHERE id = %s;",
                (str(payload.challenge_id),),
            )
            await cur.execute(
                """
                INSERT INTO otp_audits (user_id, otp_channel, status)
                VALUES (%s, %s, %s);
                """,
                (user.user_id, record["channel_id"], "expired"),
            )
        await conn.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP scaduta.")
    if record["attempts"] >= settings.otp_max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Numero massimo di tentativi raggiunto.",
        )

    expected_hash = record["code_hash"]
    provided_hash = _hash_otp_code(payload.code, user.user_id, settings.otp_code_secret)
    is_valid = secrets.compare_digest(provided_hash, expected_hash)

    async with conn.cursor() as cur:
        await cur.execute(
            """
            UPDATE otp_challenges
            SET attempts = attempts + 1,
                verified_at = CASE WHEN %s THEN NOW() ELSE verified_at END,
                status = CASE WHEN %s THEN 'VERIFIED' ELSE status END
            WHERE id = %s
            RETURNING verified_at;
            """,
            (is_valid, is_valid, str(payload.challenge_id)),
        )
        updated_row = await cur.fetchone()
        verified_at = updated_row["verified_at"] if updated_row else None

        await cur.execute(
            """
            INSERT INTO otp_audits (user_id, otp_channel, status)
            VALUES (%s, %s, %s);
            """,
            (user.user_id, record["channel_id"], "success" if is_valid else "failed"),
        )

    if not is_valid or verified_at is None:
        await conn.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Codice non valido.")

    session_expires = now + timedelta(seconds=settings.mfa_session_ttl_seconds)
    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO user_mfa_sessions (user_id, context, verified_at, expires_at)
            VALUES (%s, %s, NOW(), %s)
            ON CONFLICT (user_id, context)
            DO UPDATE SET verified_at = EXCLUDED.verified_at, expires_at = EXCLUDED.expires_at;
            """,
            (user.user_id, record["context"], session_expires),
        )
    await conn.commit()

    return OtpVerifyResponse(status="verified", verified_at=verified_at, expires_at=session_expires)
