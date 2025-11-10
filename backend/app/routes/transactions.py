"""Endpoint REST dedicati alla consultazione e creazione delle transazioni."""

from __future__ import annotations

from datetime import date
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from psycopg import AsyncConnection
from psycopg.errors import ForeignKeyViolation

from ..dependencies import AuthenticatedUser, require_scope
from ..db import get_connection_with_rls
from ..schemas import TransactionCreate, TransactionListResponse, TransactionOut, TransactionResponse

router = APIRouter(prefix="/transactions", tags=["Transactions"])


def _build_filters(
    start_date: Optional[date],
    end_date: Optional[date],
    category: Optional[str],
) -> tuple[str, List[object]]:
    """
    Costruisce la clausola WHERE dinamica per il filtraggio delle transazioni.

    Argomenti:
        start_date: Data di inizio filtro (inclusiva) se fornita dal client.
        end_date: Data di fine filtro (inclusiva) se fornita dal client.
        category: Nome della categoria per filtrare le transazioni.

    Restituisce:
        tuple[str, List[object]]: Frammento SQL e lista di parametri da applicare alla query principale.
    """
    conditions: List[str] = []
    parameters: List[object] = []
    if start_date:
        conditions.append("created_at >= %s::date")
        parameters.append(start_date)
    if end_date:
        conditions.append("created_at < (%s::date + INTERVAL '1 day')")
        parameters.append(end_date)
    if category:
        conditions.append("category = %s")
        parameters.append(category)
    clause = ""
    if conditions:
        clause = " AND " + " AND ".join(conditions)
    return clause, parameters


@router.get(
    "",
    response_model=TransactionListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_transactions(
    start_date: Optional[date] = Query(default=None, alias="from"),
    end_date: Optional[date] = Query(default=None, alias="to"),
    category: Optional[str] = Query(default=None),
    conn: AsyncConnection = Depends(get_connection_with_rls),
    user: AuthenticatedUser = Depends(require_scope("transactions:read")),
) -> TransactionListResponse:
    """
    Restituisce le transazioni dell'utente con supporto a filtri opzionali.

    Argomenti:
        start_date: Data minima inclusiva del periodo ricercato (`from`).
        end_date: Data massima inclusiva del periodo ricercato (`to`).
        category: Categoria testuale su cui filtrare i risultati.
        conn: Connessione asincrona al database prelevata dal pool.
        user: Contesto dell'utente autenticato per estrarre l'identificativo.

    Restituisce:
        TransactionListResponse: Elenco di transazioni ordinate per data decrescente.
    """
    where_clause, extra_params = _build_filters(start_date, end_date, category)
    query = f"""
        SELECT id, user_id, account_id, amount, currency, category, idem_key, direction, created_at
        FROM transactions
        WHERE user_id = %s{where_clause}
        ORDER BY created_at DESC;
    """
    params: List[object] = [user.user_id, *extra_params]
    async with conn.cursor() as cur:
        await cur.execute(query, params)
        rows = await cur.fetchall()
    transactions = [TransactionOut(**dict(row)) for row in rows]
    return TransactionListResponse(data=transactions)


@router.post(
    "",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_transaction(
    payload: TransactionCreate,
    response: Response,
    conn: AsyncConnection = Depends(get_connection_with_rls),
    user: AuthenticatedUser = Depends(require_scope("transactions:write")),
) -> TransactionResponse:
    """
    Crea una nuova transazione idempotente associata al conto dell'utente.

    Argomenti:
        payload: Dati di input forniti dal client per la nuova transazione.
        response: Oggetto risposta FastAPI da aggiornare in caso di idempotenza.
        conn: Connessione asincrona al database gestita dal pool.
        user: Informazioni dell'utente autenticato utilizzate per i controlli di coerenza.

    Restituisce:
        TransactionResponse: Dettaglio della transazione creata oppure già esistente.
    """
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT 1
            FROM accounts
            WHERE id = %s AND user_id = %s;
            """,
            (payload.account_id, user.user_id),
        )
        account_match = await cur.fetchone()
        if account_match is None:
            await conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conto inesistente o non appartenente all'utente corrente.",
            )

        try:
            await cur.execute(
                """
                INSERT INTO transactions (id, user_id, account_id, amount, currency, category, idem_key, direction)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (idem_key) DO NOTHING
                RETURNING id, user_id, account_id, amount, currency, category, idem_key, direction, created_at;
                """,
                (
                    str(uuid4()),
                    user.user_id,
                    payload.account_id,
                    payload.amount,
                    payload.currency,
                    payload.category,
                    payload.idem_key,
                    payload.direction,
                ),
            )
        except ForeignKeyViolation as err:
            await conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Associazione utente/conto non valida.",
            ) from err

        inserted_row = await cur.fetchone()
        if inserted_row is not None:
            await conn.commit()
            transaction = TransactionOut(**dict(inserted_row))
            return TransactionResponse(data=transaction)

        await cur.execute(
            """
            SELECT id, user_id, account_id, amount, currency, category, idem_key, direction, created_at
            FROM transactions
            WHERE user_id = %s AND idem_key = %s;
            """,
            (user.user_id, payload.idem_key),
        )
        existing_row = await cur.fetchone()
        await conn.commit()
        if existing_row is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Impossibile soddisfare la richiesta di idempotenza.",
            )
        transaction = TransactionOut(**dict(existing_row))
        response.status_code = status.HTTP_200_OK
        return TransactionResponse(data=transaction)
