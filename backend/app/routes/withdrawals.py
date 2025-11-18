"""Endpoint per la gestione dei metodi di prelievo e delle richieste di withdrawal."""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from uuid import uuid4

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from psycopg import AsyncConnection
from psycopg.errors import ForeignKeyViolation, UniqueViolation

from ..dependencies import AuthenticatedUser, require_scope
from ..db import get_connection_with_rls
from ..mfa import require_recent_mfa
from ..schemas import (
    WithdrawalMethodCreate,
    WithdrawalMethodOut,
    WithdrawalOut,
    WithdrawalRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payouts", tags=["Payouts"])

FEE_FIXED = Decimal("1.00")
FEE_PERCENTAGE = Decimal("0.005")
IBAN_REGEX = re.compile(r"^[A-Z0-9]{15,34}$")
BIC_REGEX = re.compile(r"^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$")


def _normalize_iban(value: str) -> str:
    return re.sub(r"\s+", "", value or "").upper()


def _iban_checksum_valid(iban: str) -> bool:
    iban = _normalize_iban(iban)
    if not IBAN_REGEX.fullmatch(iban):
        return False
    rearranged = iban[4:] + iban[:4]
    remainder = 0
    for char in rearranged:
        if char.isdigit():
            remainder = (remainder * 10 + int(char)) % 97
        else:
            remainder = (remainder * 100 + (ord(char) - 55)) % 97
    return remainder == 1


def _bic_valid(bic: str | None) -> bool:
    if not bic:
        return True
    return bool(BIC_REGEX.fullmatch(bic.upper()))


def _holder_matches(kyc_name: str | None, provided: str) -> bool:
    if not kyc_name:
        return True
    reference = kyc_name.strip().lower()
    return bool(reference) and (reference in provided.lower() or provided.lower() in reference)


def _calculate_fee(amount: Decimal) -> Decimal:
    variable = (amount * FEE_PERCENTAGE).quantize(Decimal("0.01"))
    return max(variable, FEE_FIXED)


async def _ensure_account_balance_row(conn: AsyncConnection, account_id: str, balance: Decimal) -> None:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO account_balances (account_id, available_amount, frozen_amount)
            VALUES (%s, %s, 0)
            ON CONFLICT (account_id) DO NOTHING;
            """,
            (account_id, balance),
        )
        await cur.execute(
            "UPDATE account_balances SET available_amount = %s, updated_at = NOW() WHERE account_id = %s;",
            (balance, account_id),
        )


@router.post(
    "/withdrawal-methods",
    response_model=WithdrawalMethodOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_withdrawal_method(
    payload: WithdrawalMethodCreate,
    user: AuthenticatedUser = Depends(require_scope("payouts:write")),
    _: AuthenticatedUser = Depends(require_recent_mfa()),
    conn: AsyncConnection = Depends(get_connection_with_rls),
) -> WithdrawalMethodOut:
    normalized_iban = _normalize_iban(payload.iban)
    if not _iban_checksum_valid(normalized_iban):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="IBAN non valido.")
    if not _bic_valid(payload.bic):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="BIC/SWIFT non valido.")
    kyc_name = user.claims.get("name") or user.claims.get("family_name")
    if not _holder_matches(kyc_name, payload.account_holder_name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Il titolare del conto non combacia con l'anagrafica KYC.",
        )

    async with conn.cursor() as cur:
        await cur.execute("SELECT user_id FROM withdrawal_methods WHERE iban = %s", (normalized_iban,))
        existing = await cur.fetchone()
        if existing and existing["user_id"] != user.user_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="IBAN già associato a un altro utente.")

        try:
            if payload.is_default:
                await cur.execute("UPDATE withdrawal_methods SET is_default = FALSE WHERE user_id = %s;", (user.user_id,))
            await cur.execute(
                """
                INSERT INTO withdrawal_methods (
                    user_id,
                    type,
                    iban,
                    bic,
                    bank_name,
                    account_holder_name,
                    is_default,
                    status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, user_id, type, iban, bic, bank_name, account_holder_name,
                          is_default, status, created_at, verified_at;
                """,
                (
                    user.user_id,
                    "BANK_ACCOUNT",
                    normalized_iban,
                    payload.bic.upper() if payload.bic else None,
                    payload.bank_name,
                    payload.account_holder_name,
                    payload.is_default,
                    "VERIFIED",
                ),
            )
        except UniqueViolation as exc:  # pragma: no cover - gestito sopra ma aggiungiamo fallback
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="IBAN duplicato.") from exc
        record = await cur.fetchone()
    await conn.commit()
    return WithdrawalMethodOut(**dict(record))


@router.get(
    "/withdrawal-methods",
    response_model=list[WithdrawalMethodOut],
    status_code=status.HTTP_200_OK,
)
async def list_withdrawal_methods(
    user: AuthenticatedUser = Depends(require_scope("payouts:read")),
    conn: AsyncConnection = Depends(get_connection_with_rls),
) -> list[WithdrawalMethodOut]:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, user_id, type, iban, bic, bank_name, account_holder_name,
                   is_default, status, created_at, verified_at
            FROM withdrawal_methods
            WHERE user_id = %s
            ORDER BY created_at DESC;
            """,
            (user.user_id,),
        )
        rows = await cur.fetchall()
    return [WithdrawalMethodOut(**dict(row)) for row in rows]


@router.delete(
    "/withdrawal-methods/{method_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_withdrawal_method(
    method_id: str,
    user: AuthenticatedUser = Depends(require_scope("payouts:write")),
    conn: AsyncConnection = Depends(get_connection_with_rls),
) -> Response:
    logger.info("delete request for method_id=%s user_id=%s", method_id, user.user_id)
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id FROM withdrawal_methods WHERE id = %s AND user_id = %s;",
            (method_id, user.user_id),
        )
        method = await cur.fetchone()
        if method is None:
            logger.warning("method not found or not owned: method_id=%s user_id=%s", method_id, user.user_id)
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metodo di prelievo inesistente.")
        try:
            await cur.execute("DELETE FROM withdrawal_methods WHERE id = %s AND user_id = %s;", (method_id, user.user_id))
        except ForeignKeyViolation as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossibile eliminare il metodo: ci sono richieste di prelievo collegate.",
            ) from exc
    await conn.commit()
    logger.info("method deleted method_id=%s user_id=%s", method_id, user.user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/withdrawals",
    response_model=WithdrawalOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_withdrawal(
    payload: WithdrawalRequest,
    request: Request,
    user: AuthenticatedUser = Depends(require_scope("payouts:write")),
    _: AuthenticatedUser = Depends(require_recent_mfa()),
    conn: AsyncConnection = Depends(get_connection_with_rls),
) -> WithdrawalOut:
    try:
        amount = Decimal(payload.amount)
    except (InvalidOperation, TypeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Importo non valido.") from exc
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="L'importo deve essere positivo.")

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, user_id, currency, balance
            FROM accounts
            WHERE id = %s AND user_id = %s
            FOR UPDATE;
            """,
            (str(payload.account_id), user.user_id),
        )
        account = await cur.fetchone()
        if account is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conto non trovato.")
        if account["currency"] != payload.currency:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valuta del conto non supportata.")

        await cur.execute(
            """
            SELECT id, status, account_holder_name
            FROM withdrawal_methods
            WHERE id = %s AND user_id = %s;
            """,
            (str(payload.method_id), user.user_id),
        )
        method = await cur.fetchone()
        if method is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metodo di prelievo inesistente.")
        if method["status"] != "VERIFIED":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Metodo non verificato.")

        current_balance = Decimal(account["balance"])
        fee = _calculate_fee(amount).quantize(Decimal("0.01"))
        total_debit = (amount + fee).quantize(Decimal("0.01"))
        if current_balance < total_debit:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Saldo insufficiente.")

        await _ensure_account_balance_row(conn, str(account["id"]), current_balance)

        await cur.execute(
            "UPDATE accounts SET balance = balance - %s WHERE id = %s;",
            (total_debit, str(account["id"])),
        )
        await cur.execute(
            """
            UPDATE account_balances
            SET available_amount = available_amount - %s,
                frozen_amount = frozen_amount + %s,
                updated_at = NOW()
            WHERE account_id = %s;
            """,
            (total_debit, total_debit, str(account["id"])),
        )

        reference = f"WD-{uuid4().hex[:10].upper()}"
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        await cur.execute(
            """
            INSERT INTO withdrawals (
                user_id, method_id, account_id, amount, fee, currency, total_debit,
                status, requested_ip, requested_user_agent, reference
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'PENDING', %s, %s, %s)
            RETURNING id, user_id, method_id, account_id, amount, fee, currency,
                      total_debit, status, requested_at, reference;
            """,
            (
                user.user_id,
                str(payload.method_id),
                str(payload.account_id),
                amount,
                fee,
                payload.currency,
                total_debit,
                client_ip,
                user_agent,
                reference,
            ),
        )
        record = await cur.fetchone()
    await conn.commit()
    return WithdrawalOut(**dict(record))


@router.get(
    "/withdrawals",
    response_model=list[WithdrawalOut],
    status_code=status.HTTP_200_OK,
)
async def list_withdrawals(
    user: AuthenticatedUser = Depends(require_scope("payouts:read")),
    conn: AsyncConnection = Depends(get_connection_with_rls),
) -> list[WithdrawalOut]:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, user_id, method_id, account_id, amount, fee, currency,
                   total_debit, status, requested_at, reference
            FROM withdrawals
            WHERE user_id = %s
            ORDER BY requested_at DESC;
            """,
            (user.user_id,),
        )
        rows = await cur.fetchall()
    return [WithdrawalOut(**dict(row)) for row in rows]
