"""Test di integrazione per gli endpoint del market crypto."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import uuid4

import pytest

DEFAULT_USER_ID = "aaaaaaaa-1111-2222-3333-444444444444"
DEFAULT_ACCOUNT_ID = "bbbbbbbb-1111-2222-3333-555555555555"


@pytest.fixture()
def cleanup_crypto_positions(sync_connection):
    """Svuota la tabella delle posizioni crypto prima e dopo il test."""
    with sync_connection.cursor() as cur:
        cur.execute("DELETE FROM user_crypto_positions;")
        sync_connection.commit()
    yield
    with sync_connection.cursor() as cur:
        cur.execute("DELETE FROM user_crypto_positions;")
        sync_connection.commit()


@pytest.mark.asyncio
async def test_market_prices_returns_snapshot(async_client, monkeypatch):
    """Verifica che /market/prices restituisca i dati provenienti dal client CoinGecko."""

    sample_snapshot = [
        {
            "id": "bitcoin",
            "symbol": "BTC",
            "name": "Bitcoin",
            "price": 31000.5,
            "change24h": 1.25,
            "image": "https://assets.example/bitcoin.png",
            "market_cap": 1000000000,
        }
    ]

    async def fake_snapshot():
        return sample_snapshot

    monkeypatch.setattr("backend.app.routes.market.coingecko.fetch_market_snapshot", fake_snapshot)

    response = await async_client.get("/market/prices")

    assert response.status_code == 200, response.text
    assert response.json()["data"] == sample_snapshot


@pytest.mark.asyncio
async def test_market_asset_includes_position_and_transactions(
    async_client,
    sync_connection,
    auth_headers_factory,
    cleanup_transactions,
    cleanup_crypto_positions,
    monkeypatch,
):
    """L'endpoint di dettaglio deve combinare prezzi, storico, posizione e transazioni utente."""

    sample_snapshot = [
        {
            "id": "bitcoin",
            "symbol": "BTC",
            "name": "Bitcoin",
            "price": 30000.0,
            "change24h": -0.5,
            "image": None,
            "market_cap": 900000000,
        }
    ]
    sample_history = [
        {"timestamp": 1730000000000, "price": 29500.0},
        {"timestamp": 1730086400000, "price": 30500.0},
    ]

    async def fake_snapshot():
        return sample_snapshot

    async def fake_history(asset_id: str, days: int = 7):
        assert asset_id == "bitcoin"
        assert days == 7
        return sample_history

    monkeypatch.setattr("backend.app.routes.market.coingecko.fetch_market_snapshot", fake_snapshot)
    monkeypatch.setattr("backend.app.routes.market.coingecko.fetch_history", fake_history)

    position_id = str(uuid4())
    transaction_id = str(uuid4())
    with sync_connection.cursor() as cur:
        cur.execute(
            """
            INSERT INTO user_crypto_positions (
                id, user_id, account_id, asset_symbol, asset_name, amount,
                book_cost_eur, last_valuation_eur, price_source
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                position_id,
                DEFAULT_USER_ID,
                DEFAULT_ACCOUNT_ID,
                "BTC",
                "Bitcoin",
                Decimal("0.7500000000"),
                Decimal("15000.00"),
                Decimal("18000.00"),
                "test-suite",
            ),
        )
        cur.execute(
            """
            INSERT INTO transactions (
                id, user_id, account_id, amount, currency, category, idem_key, direction, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                transaction_id,
                DEFAULT_USER_ID,
                DEFAULT_ACCOUNT_ID,
                Decimal("5000.00"),
                "EUR",
                "BTC",
                str(uuid4()),
                "buy",
                datetime.utcnow(),
            ),
        )
        sync_connection.commit()

    headers = auth_headers_factory(user_id=DEFAULT_USER_ID, scopes={"accounts:read"})
    response = await async_client.get("/market/assets/bitcoin", headers=headers)

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["asset"]["id"] == "bitcoin"
    assert payload["history"] == sample_history
    assert payload["position"]["ticker"] == "BTC"
    assert payload["position"]["id"] == position_id
    assert any(tx["id"] == transaction_id for tx in payload["transactions"])


@pytest.mark.asyncio
async def test_market_order_buy_updates_account_and_position(
    async_client,
    sync_connection,
    auth_headers_factory,
    cleanup_transactions,
    cleanup_crypto_positions,
):
    """Un ordine di acquisto deve scalare il saldo e creare/aggiornare la posizione."""

    with sync_connection.cursor() as cur:
        cur.execute("UPDATE accounts SET balance = %s WHERE id = %s;", (Decimal("2000.00"), DEFAULT_ACCOUNT_ID))
        sync_connection.commit()

    payload = {
        "account_id": DEFAULT_ACCOUNT_ID,
        "asset_symbol": "BTC",
        "asset_name": "Bitcoin",
        "price_eur": "20000.00",
        "quantity": "0.0500",
        "side": "buy",
    }

    headers = auth_headers_factory(user_id=DEFAULT_USER_ID, scopes={"transactions:write"})
    response = await async_client.post("/market/orders", headers=headers, json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["position"] is not None
    assert body["position"]["ticker"] == "BTC"

    with sync_connection.cursor() as cur:
        cur.execute("SELECT balance FROM accounts WHERE id = %s;", (DEFAULT_ACCOUNT_ID,))
        new_balance = cur.fetchone()[0]
        cur.execute(
            "SELECT amount FROM user_crypto_positions WHERE user_id = %s AND asset_symbol = %s;",
            (DEFAULT_USER_ID, "BTC"),
        )
        stored_amount = cur.fetchone()[0]

    expected_total = Decimal(payload["quantity"]) * Decimal(payload["price_eur"])
    assert new_balance == Decimal("2000.00") - expected_total
    assert stored_amount == Decimal(payload["quantity"])
