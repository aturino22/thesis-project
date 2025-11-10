"""Endpoint REST dedicati alle posizioni crypto dell'utente."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import List

from fastapi import APIRouter, Depends, status
from psycopg import AsyncConnection

from ..dependencies import AuthenticatedUser, require_scope
from ..db import get_connection_with_rls
from ..schemas import CryptoPositionListResponse, CryptoPositionOut

router = APIRouter(prefix="/crypto-positions", tags=["Crypto Positions"])

_ICON_BASE = "https://assets.coincap.io/assets/icons/{symbol}@2x.png"
_PERCENT_PRECISION = Decimal("0.01")


def _build_icon_url(symbol: str | None) -> str | None:
    if not symbol:
        return None
    return _ICON_BASE.format(symbol=symbol.lower())


def _compute_change_percent(
    book_cost: Decimal | None,
    current_value: Decimal | None,
) -> Decimal | None:
    if book_cost is None or current_value is None:
        return None
    if book_cost == 0:
        return None
    try:
        percent = (current_value - book_cost) / book_cost * Decimal("100")
        return percent.quantize(_PERCENT_PRECISION)
    except (InvalidOperation, ZeroDivisionError):
        return None


@router.get(
    "",
    response_model=CryptoPositionListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_crypto_positions(
    conn: AsyncConnection = Depends(get_connection_with_rls),
    user: AuthenticatedUser = Depends(require_scope("crypto:read")),
) -> CryptoPositionListResponse:
    """
    Restituisce tutte le posizioni crypto dell'utente autenticato.

    Argomenti:
        conn: Connessione asincrona con RLS preconfigurata.
        user: Contesto autenticato utilizzato per derivare eventuali permessi futuri.

    Restituisce:
        CryptoPositionListResponse: Collezione di asset con valore aggregato totale.
    """
    query = """
        SELECT
            id,
            user_id,
            account_id,
            asset_symbol,
            asset_name,
            network,
            amount,
            book_cost_eur,
            last_valuation_eur,
            price_source,
            synced_at,
            created_at,
            updated_at
        FROM user_crypto_positions
        WHERE user_id = %s
        ORDER BY asset_symbol ASC;
    """
    async with conn.cursor() as cur:
        await cur.execute(query, (user.user_id,))
        rows = await cur.fetchall()

    positions: List[CryptoPositionOut] = []
    total_value = Decimal("0")
    for row in rows:
        record = dict(row)
        current_value = record["last_valuation_eur"] or Decimal("0")
        total_value += current_value
        change_percent = _compute_change_percent(record.get("book_cost_eur"), record.get("last_valuation_eur"))
        positions.append(
            CryptoPositionOut(
                id=record["id"],
                ticker=record["asset_symbol"],
                name=record["asset_name"],
                amount=record["amount"],
                eur_value=current_value,
                change_24h_percent=change_percent,
                icon_url=_build_icon_url(record["asset_symbol"]),
                price_source=record["price_source"],
                network=record["network"],
                account_id=record["account_id"],
                synced_at=record["synced_at"],
                created_at=record["created_at"],
                updated_at=record["updated_at"],
            )
        )

    return CryptoPositionListResponse(data=positions, total_eur_value=total_value)
