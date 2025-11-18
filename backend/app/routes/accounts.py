"""Endpoint REST dedicati alla gestione dei conti utente."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg import AsyncConnection

from ..dependencies import AuthenticatedUser, require_scope
from ..db import get_connection_with_rls
from ..schemas import AccountListResponse, AccountOut, AccountTopUpOut, AccountTopUpRequest

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.get(
    "",
    response_model=AccountListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_accounts(
    user: AuthenticatedUser = Depends(require_scope("accounts:read")),
    conn: AsyncConnection = Depends(get_connection_with_rls),
) -> AccountListResponse:
    """
    Restituisce l'elenco dei conti associati all'utente autenticato.

    Argomenti:
        conn: Connessione asincrona al database ottenuta dal pool condiviso.
        user: Contesto dell'utente autenticato utilizzato per filtrare i risultati.

    Restituisce:
        AccountListResponse: Payload con la collezione di conti ordinati per data di creazione.
    """
    query = """
        SELECT id, user_id, currency, balance, name, created_at
        FROM accounts
        WHERE user_id = %s
        ORDER BY created_at ASC;
    """
    async with conn.cursor() as cur:
        await cur.execute(query, (user.user_id,))
        rows = await cur.fetchall()
    accounts = [AccountOut(**dict(row)) for row in rows]
    return AccountListResponse(data=accounts)


@router.post(
    "/{account_id}/topup",
    response_model=AccountOut,
    status_code=status.HTTP_200_OK,
)
async def topup_account(
    account_id: UUID,
    payload: AccountTopUpRequest,
    user: AuthenticatedUser = Depends(require_scope("transactions:write")),
    conn: AsyncConnection = Depends(get_connection_with_rls),
) -> AccountOut:
    """
    Incrementa il saldo di un conto appartenente all'utente autenticato.
    """
    async with conn.cursor() as cur:
        await cur.execute(
            """
            UPDATE accounts
            SET balance = balance + %s
            WHERE id = %s AND user_id = %s
            RETURNING id, user_id, currency, balance, name, created_at;
            """,
            (payload.amount, str(account_id), user.user_id),
        )
        row = await cur.fetchone()
        if row is None:
            await conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conto inesistente o non appartenente all'utente.",
            )
        await cur.execute(
            """
            INSERT INTO account_topups (user_id, account_id, amount, currency)
            VALUES (%s, %s, %s, %s);
            """,
            (user.user_id, str(account_id), payload.amount, row["currency"]),
        )
    await conn.commit()
    return AccountOut(**dict(row))


@router.get(
    "/topups",
    response_model=list[AccountTopUpOut],
    status_code=status.HTTP_200_OK,
)
async def list_account_topups(
    user: AuthenticatedUser = Depends(require_scope("transactions:read")),
    conn: AsyncConnection = Depends(get_connection_with_rls),
) -> list[AccountTopUpOut]:
    """Restituisce la cronologia delle ricariche simulate dell'utente."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, user_id, account_id, amount, currency, created_at
            FROM account_topups
            WHERE user_id = %s
            ORDER BY created_at DESC;
            """,
            (user.user_id,),
        )
        rows = await cur.fetchall()
    return [AccountTopUpOut(**dict(row)) for row in rows]
