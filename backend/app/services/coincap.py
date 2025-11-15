"""Utility per interrogare CoinCap (rest.coincap.io) e normalizzare i dati di mercato crypto."""

from __future__ import annotations

import time
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Tuple

import httpx

from ..config import get_settings

ICON_BASE = "https://assets.coincap.io/assets/icons/{symbol}@2x.png"
CACHE_TTL_SECONDS = 3 * 60 * 60  # 3 hours
DEFAULT_BASE_URL = "https://rest.coincap.io/v3"

SUPPORTED_ASSETS = [
    {"id": "bitcoin", "symbol": "BTC", "name": "Bitcoin"},
    {"id": "ethereum", "symbol": "ETH", "name": "Ethereum"},
    {"id": "xrp", "symbol": "XRP", "name": "XRP"},
    {"id": "solana", "symbol": "SOL", "name": "Solana"},
    {"id": "dogecoin", "symbol": "DOGE", "name": "Dogecoin"},
]

ID_TO_ASSET = {asset["id"]: asset for asset in SUPPORTED_ASSETS}
SYMBOL_TO_ID = {asset["symbol"].upper(): asset["id"] for asset in SUPPORTED_ASSETS}

_market_cache: List[dict] | None = None
_market_cache_ts = 0.0
_history_cache: Dict[Tuple[str, int], Tuple[float, List[dict]]] = {}


def normalize_asset_identifier(identifier: str) -> str | None:
    """Accetta id o ticker e restituisce l'id CoinCap normalizzato."""
    identifier = identifier.strip()
    if identifier in ID_TO_ASSET:
        return identifier
    upper = identifier.upper()
    return SYMBOL_TO_ID.get(upper)


def _settings():
    return get_settings()


def _base_url() -> str:
    configured = (_settings().coincap_base_url or DEFAULT_BASE_URL).rstrip("/")
    return configured or DEFAULT_BASE_URL


def _auth_headers() -> dict[str, str]:
    api_key = _settings().coincap_api_key
    if not api_key:
        return {}
    return {"Authorization": f"Bearer {api_key}"}


def _to_decimal(value: str | float | int | None) -> Decimal:
    if value is None:
        return Decimal("0")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")


def _build_icon(symbol: str | None) -> str | None:
    if not symbol:
        return None
    return ICON_BASE.format(symbol=symbol.lower())


async def _request(path: str, params: dict | None = None) -> dict | list:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{_base_url()}{path}", params=params, headers=_auth_headers())
        resp.raise_for_status()
        return resp.json()


async def fetch_market_snapshot() -> List[dict]:
    """Restituisce i prezzi correnti (priceUsd) per tutti gli asset supportati."""
    global _market_cache, _market_cache_ts
    now = time.time()
    if _market_cache and now - _market_cache_ts < CACHE_TTL_SECONDS:
        return _market_cache

    ids = ",".join(asset["id"] for asset in SUPPORTED_ASSETS)
    payload = await _request("/assets", params={"ids": ids})
    entries = {item["id"]: item for item in payload.get("data", [])}

    normalized: List[dict] = []
    for asset in SUPPORTED_ASSETS:
        entry = entries.get(asset["id"], {})
        normalized.append(
            {
                "id": asset["id"],
                "symbol": asset["symbol"].upper(),
                "name": entry.get("name", asset["name"]),
                "price": float(entry.get("priceUsd") or 0),
                "change24h": float(entry.get("changePercent24Hr") or 0),
                "image": _build_icon(asset["symbol"]),
                "market_cap": float(entry.get("marketCapUsd") or 0) if entry.get("marketCapUsd") else None,
            }
        )

    _market_cache = normalized
    _market_cache_ts = now
    return normalized


async def fetch_history(asset_id: str, days: int = 7) -> List[dict]:
    """Restituisce l'andamento giornaliero degli ultimi N giorni per l'asset specificato."""
    key = (asset_id, days)
    now = time.time()
    cached = _history_cache.get(key)
    if cached and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    end_ms = int(time.time() * 1000)
    start_ms = end_ms - days * 24 * 60 * 60 * 1000
    payload = await _request(
        f"/assets/{asset_id}/history",
        params={
            "interval": "d1",
            "start": start_ms,
            "end": end_ms,
        },
    )
    history = [
        {"timestamp": int(point.get("time") or 0), "price": float(point.get("priceUsd") or 0)}
        for point in payload.get("data", [])
    ]
    _history_cache[key] = (now, history)
    return history


async def fetch_price_by_symbol(symbol: str) -> Decimal:
    """Recupera il prezzo corrente (priceUsd) usando l'endpoint dedicato."""
    payload = await _request(f"/price/bysymbol/{symbol.upper()}")
    data = payload.get("data")
    if isinstance(data, list):
        target = data[0] if data else None
        if isinstance(target, str | int | float):
            return _to_decimal(target)
    elif isinstance(data, dict):
        target = data
    else:
        target = None
    if target is None:
        return Decimal("0")
    if isinstance(target, str | int | float):
        return _to_decimal(target)
    return _to_decimal(target.get("priceUsd"))
