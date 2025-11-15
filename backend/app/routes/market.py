"""Endpoint per la gestione del market crypto (acquisti/vendite)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg import AsyncConnection

from ..dependencies import AuthenticatedUser, require_scope
from ..db import get_connection, get_connection_with_rls
from ..schemas import (
    AccountOut,
    CryptoOrderRequest,
    CryptoOrderResponse,
    CryptoPositionOut,
    TransactionOut,
)
from ..services import coincap


router = APIRouter(prefix="/market", tags=["Market"])


async def _fetch_account(conn: AsyncConnection, account_id: str, user_id: str) -> dict[str, object] | None:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, user_id, currency, balance, name, created_at
            FROM accounts
            WHERE id = %s AND user_id = %s
            FOR UPDATE
            """,
            (account_id, user_id),
        )
        row = await cur.fetchone()
    return dict(row) if row else None


async def _fetch_position(
    conn: AsyncConnection,
    user_id: str,
    symbol: str,
) -> dict[str, object] | None:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT *
            FROM user_crypto_positions
            WHERE user_id = %s AND asset_symbol = %s
            FOR UPDATE
            """,
            (user_id, symbol),
        )
        row = await cur.fetchone()
    return dict(row) if row else None


async def _fetch_transactions(
    conn: AsyncConnection,
    user_id: str,
    category: str,
    limit: int = 10,
) -> list[dict[str, object]]:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, user_id, account_id, amount, currency, category, idem_key, direction, created_at
            FROM transactions
            WHERE user_id = %s AND category = %s
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (user_id, category, limit),
        )
        rows = await cur.fetchall()
    return [dict(row) for row in rows]


def _to_transaction_out(record: dict[str, object]) -> TransactionOut:
    return TransactionOut(
        id=record["id"],
        user_id=record["user_id"],
        account_id=record["account_id"],
        amount=Decimal(record["amount"]),
        currency=record["currency"],
        category=record["category"],
        idem_key=record["idem_key"],
        direction=record["direction"],
        created_at=record["created_at"],
    )


def _to_account_out(record: dict[str, object]) -> AccountOut:
    return AccountOut(
        id=record["id"],
        user_id=record["user_id"],
        currency=record["currency"],
        balance=Decimal(record["balance"]),
        name=record["name"],
        created_at=record["created_at"],
    )


def _to_position_out(record: dict[str, object]) -> CryptoPositionOut:
    return CryptoPositionOut(
        id=record["id"],
        ticker=record["asset_symbol"],
        name=record["asset_name"],
        amount=Decimal(record["amount"]),
        eur_value=Decimal(record["last_valuation_eur"] or 0),
        change_24h_percent=None,
        icon_url=None,
        price_source=record["price_source"],
        network=record["network"],
        account_id=record["account_id"],
        synced_at=record["synced_at"],
        created_at=record["created_at"],
        updated_at=record["updated_at"],
    )


async def _load_crypto_symbol_map(conn: AsyncConnection, symbols: set[str]) -> dict[str, str]:
    if not symbols:
        return {}
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, UPPER(symbol) AS symbol FROM crypto WHERE UPPER(symbol) = ANY(%s);",
            (list(symbols),),
        )
        rows = await cur.fetchall()
    return {row["symbol"]: row["id"] for row in rows}


async def _fetch_crypto_metadata(conn: AsyncConnection, crypto_id: str) -> dict[str, object] | None:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, symbol, name, explorer_url
            FROM crypto
            WHERE id = %s
            """,
            (crypto_id,),
        )
        row = await cur.fetchone()
    return dict(row) if row else None


async def _load_variation_history(
    conn: AsyncConnection,
    crypto_id: str,
    window: timedelta,
) -> list[dict[str, object]]:
    if window <= timedelta(0):
        window = timedelta(days=1)
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT
                (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT AS ts_ms,
                price
            FROM crypto_variation
            WHERE crypto_id = %s
              AND created_at >= NOW() - %s
            ORDER BY created_at ASC
            """,
            (crypto_id, window),
        )
        rows = await cur.fetchall()
    return [
        {
            "timestamp": int(row["ts_ms"]),
            "price": float(row["price"]),
        }
        for row in rows
    ]


async def _refresh_price_snapshots(conn: AsyncConnection, symbols: list[str]) -> dict[str, Decimal]:
    upper_symbols = {symbol.upper() for symbol in symbols if symbol}
    if not upper_symbols:
        return {}

    symbol_map = await _load_crypto_symbol_map(conn, upper_symbols)
    recorded: dict[str, Decimal] = {}
    inserted = False
    async with conn.cursor() as cur:
        for symbol in upper_symbols:
            crypto_id = symbol_map.get(symbol)
            if not crypto_id:
                continue
            price = await coincap.fetch_price_by_symbol(symbol)
            recorded[symbol] = price
            await cur.execute(
                "INSERT INTO crypto_variation (crypto_id, price) VALUES (%s, %s);",
                (crypto_id, price),
            )
            inserted = True
    if inserted:
        await conn.commit()
    return recorded


@router.get(
    "/prices",
    status_code=status.HTTP_200_OK,
)
async def list_market_prices(
    conn: AsyncConnection = Depends(get_connection),
) -> dict:
    """Restituisce i prezzi correnti delle crypto supportate."""
    data = await coincap.fetch_market_snapshot()
    price_snapshots = await _refresh_price_snapshots(conn, [item["symbol"] for item in data])
    for entry in data:
        symbol = entry["symbol"].upper()
        if symbol in price_snapshots:
            entry["price"] = float(price_snapshots[symbol])
    return {"data": data}


@router.get(
    "/assets/{asset_identifier}",
    status_code=status.HTTP_200_OK,
)
async def get_market_asset(
    asset_identifier: str,
    days: int = Query(default=7, ge=1, le=30),
    conn: AsyncConnection = Depends(get_connection_with_rls),
    user: AuthenticatedUser = Depends(require_scope("accounts:read")),
) -> dict:
    """Dettaglio di una crypto: prezzo attuale, storico, posizioni e transazioni utente."""
    asset_id = coincap.normalize_asset_identifier(asset_identifier.lower())
    if not asset_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset non supportato.")

    market_snapshot = await coincap.fetch_market_snapshot()
    asset = next((item for item in market_snapshot if item["id"] == asset_id), None)
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset non disponibile.")

    metadata = await _fetch_crypto_metadata(conn, asset_id)
    asset["explorer_url"] = metadata.get("explorer_url") if metadata else None

    history_window = timedelta(days=days)
    history = await _load_variation_history(conn, asset_id, history_window)
    if not history:
        history = await coincap.fetch_history(asset_id, days=days)
    symbol = asset["symbol"]
    position_row = await _fetch_position(conn, user.user_id, symbol)
    transactions_rows = await _fetch_transactions(conn, user.user_id, symbol)

    position_payload = _to_position_out(position_row).model_dump() if position_row else None
    transactions_payload = [_to_transaction_out(row).model_dump() for row in transactions_rows]

    return {
        "asset": asset,
        "history": history,
        "position": position_payload,
        "transactions": transactions_payload,
    }


@router.post(
    "/orders",
    response_model=CryptoOrderResponse,
    status_code=status.HTTP_200_OK,
)
async def process_crypto_order(
    payload: CryptoOrderRequest,
    conn: AsyncConnection = Depends(get_connection_with_rls),
    user: AuthenticatedUser = Depends(require_scope("transactions:write")),
) -> CryptoOrderResponse:
    """
    Gestisce un acquisto/vendita di crypto e aggiorna il saldo del conto.
    """

    quantity = Decimal(payload.quantity)
    price = Decimal(payload.price_eur)
    total_value = (quantity * price).quantize(Decimal("0.01"))

    account = await _fetch_account(conn, str(payload.account_id), user.user_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conto non trovato.")

    if account["currency"] != "EUR":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Operazioni disponibili solo per conti EUR.")

    symbol = payload.asset_symbol.upper()
    async with conn.cursor() as cur:
        if payload.side == "buy":
            if Decimal(account["balance"]) < total_value:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Saldo insufficiente per completare l'acquisto.")
            await cur.execute(
                """
                UPDATE accounts
                SET balance = balance - %s
                WHERE id = %s
                """,
                (total_value, account["id"]),
            )

            existing = await _fetch_position(conn, user.user_id, symbol)
            if existing:
                await cur.execute(
                    """
                    UPDATE user_crypto_positions
                    SET amount = amount + %s,
                        last_valuation_eur = %s,
                        book_cost_eur = COALESCE(book_cost_eur, 0) + %s,
                        asset_name = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (
                        quantity,
                        (Decimal(existing["amount"]) + quantity) * price,
                        total_value,
                        payload.asset_name,
                        existing["id"],
                    ),
                )
                position = await _fetch_position(conn, user.user_id, symbol)
            else:
                await cur.execute(
                    """
                    INSERT INTO user_crypto_positions (
                        user_id,
                        account_id,
                        asset_symbol,
                        asset_name,
                        amount,
                        book_cost_eur,
                        last_valuation_eur,
                        price_source
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        user.user_id,
                        payload.account_id,
                        symbol,
                        payload.asset_name,
                        quantity,
                        total_value,
                        quantity * price,
                        "frontend-simulated",
                    ),
                )
                position = dict(await cur.fetchone())
        else:  # sell
            existing = await _fetch_position(conn, user.user_id, symbol)
            if not existing or Decimal(existing["amount"]) < quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Posizione insufficiente per vendere la quantità richiesta."
                )

            await cur.execute(
                """
                UPDATE accounts
                SET balance = balance + %s
                WHERE id = %s
                """,
                (total_value, account["id"]),
            )

            new_amount = Decimal(existing["amount"]) - quantity
            if new_amount <= 0:
                await cur.execute(
                    "DELETE FROM user_crypto_positions WHERE id = %s",
                    (existing["id"],),
                )
                position = None
            else:
                await cur.execute(
                    """
                    UPDATE user_crypto_positions
                    SET amount = %s,
                        last_valuation_eur = %s,
                        book_cost_eur = GREATEST(COALESCE(book_cost_eur,0) - %s, 0),
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (new_amount, new_amount * price, total_value, existing["id"]),
                )
                position = await _fetch_position(conn, user.user_id, symbol)

        idem_key = f"market:{uuid4()}"
        await cur.execute(
            """
            INSERT INTO transactions (id, user_id, account_id, amount, currency, category, idem_key, direction)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                str(uuid4()),
                user.user_id,
                payload.account_id,
                total_value,
                "EUR",
                symbol,
                idem_key,
                "buy" if payload.side == "buy" else "sell",
            ),
        )

    await conn.commit()

    updated_account = await _fetch_account(conn, str(payload.account_id), user.user_id)
    if updated_account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conto non trovato dopo l'aggiornamento.")

    return CryptoOrderResponse(
        account=_to_account_out(updated_account),
        position=_to_position_out(position) if position else None,
    )
