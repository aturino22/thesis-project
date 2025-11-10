"""Endpoint REST dedicati alla gestione dei conti utente."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from psycopg import AsyncConnection

from ..dependencies import AuthenticatedUser, require_scope
from ..db import get_connection_with_rls
from ..schemas import AccountListResponse, AccountOut

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
