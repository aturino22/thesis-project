"""Utility per interrogare CoinGecko con una semplice cache in-memory."""

from __future__ import annotations

import time
from decimal import Decimal
from typing import Dict, List, Tuple

import httpx

COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"
CACHE_TTL_SECONDS = 120

SUPPORTED_ASSETS = [
  {"id": "bitcoin", "symbol": "BTC", "name": "Bitcoin"},
  {"id": "solana", "symbol": "SOL", "name": "Solana"},
  {"id": "ripple", "symbol": "XRP", "name": "XRP"},
  {"id": "zcash", "symbol": "ZEC", "name": "ZCash"},
  {"id": "dogecoin", "symbol": "DOGE", "name": "Dogecoin"},
  {"id": "ethereum", "symbol": "ETH", "name": "Ethereum"},
  {"id": "stellar", "symbol": "XLM", "name": "Stellar"},
  {"id": "shiba-inu", "symbol": "SHIB", "name": "ShibaInu"},
  {"id": "pepe", "symbol": "PEPE", "name": "Pepe"},
]

ID_TO_ASSET = {asset["id"]: asset for asset in SUPPORTED_ASSETS}
SYMBOL_TO_ID = {asset["symbol"].upper(): asset["id"] for asset in SUPPORTED_ASSETS}

_market_cache: List[dict] | None = None
_market_cache_ts = 0.0
_history_cache: Dict[Tuple[str, int], Tuple[float, List[dict]]] = {}


def normalize_asset_identifier(identifier: str) -> str | None:
    """Accetta id o ticker e restituisce l'id CoinGecko normalizzato."""
    identifier = identifier.strip()
    if identifier in ID_TO_ASSET:
        return identifier
    upper = identifier.upper()
    return SYMBOL_TO_ID.get(upper)


async def _request(path: str, params: dict | None = None) -> dict | list:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{COINGECKO_BASE_URL}{path}", params=params)
        resp.raise_for_status()
        return resp.json()


async def fetch_market_snapshot() -> List[dict]:
    """Restituisce i prezzi correnti per tutti gli asset supportati (con cache)."""
    global _market_cache, _market_cache_ts
    now = time.time()
    if _market_cache and now - _market_cache_ts < CACHE_TTL_SECONDS:
        return _market_cache

    ids = ",".join(asset["id"] for asset in SUPPORTED_ASSETS)
    data = await _request(
        "/coins/markets",
        params={
            "vs_currency": "eur",
            "ids": ids,
            "price_change_percentage": "24h",
        },
    )
    normalized: List[dict] = []
    for entry in data:
        normalized.append(
            {
                "id": entry["id"],
                "symbol": entry["symbol"].upper(),
                "name": entry["name"],
                "price": float(entry.get("current_price") or 0),
                "change24h": float(entry.get("price_change_percentage_24h") or 0),
                "image": entry.get("image"),
                "market_cap": entry.get("market_cap"),
            }
        )

    _market_cache = normalized
    _market_cache_ts = now
    return normalized


async def fetch_history(asset_id: str, days: int = 7) -> List[dict]:
    """Restituisce l'andamento (prices) degli ultimi N giorni per l'asset specificato."""
    key = (asset_id, days)
    now = time.time()
    cached = _history_cache.get(key)
    if cached and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    data = await _request(
        f"/coins/{asset_id}/market_chart",
        params={"vs_currency": "eur", "days": str(days)},
    )
    history = [
        {"timestamp": int(point[0]), "price": float(point[1])}
        for point in data.get("prices", [])
    ]
    _history_cache[key] = (now, history)
    return history
