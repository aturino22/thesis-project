"""Endpoint REST dedicato alla gestione delle OTP."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg import AsyncConnection

from ..config import Settings, get_settings
from ..db import get_connection_with_rls
from ..dependencies import AuthenticatedUser, get_authenticated_user, require_scope
from ..schemas import OtpSendRequest, OtpSendResponse
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
    dispatch_payload: dict[str, object] = {
        "user_id": user.user_id,
        "channel": channel_code,
        "code": otp_code,
        "expires_at": expires_at_dt.isoformat(),
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

    if payload.metadata:
        dispatch_payload["metadata"] = payload.metadata

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

    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO otp_audits (user_id, otp_channel, status)
            VALUES (%s, %s, %s);
            """,
            (user.user_id, channel_id, status_value),
        )
    await conn.commit()

    return OtpSendResponse(status="sent", channel_code=channel_code, expires_at=expires_at_dt)
