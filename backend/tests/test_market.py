"""Test di integrazione per gli endpoint del market crypto."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest

DEFAULT_USER_ID = "aaaaaaaa-1111-2222-3333-444444444444"
DEFAULT_ACCOUNT_ID = "bbbbbbbb-1111-2222-3333-555555555555"


def insert_user_crypto_position(
    cursor,
    *,
    position_id: str,
    user_id: str,
    account_id: str,
    symbol: str,
    asset_name: str,
    amount: Decimal,
    book_cost: Decimal,
    last_valuation: Decimal,
    price_source: str,
) -> None:
    """Inserisce/aggiorna una posizione assicurando la corrispondenza placeholder/parametri."""
    cursor.execute(
        """
        INSERT INTO user_crypto_positions (
            id,
            user_id,
            account_id,
            asset_symbol,
            asset_name,
            amount,
            book_cost_eur,
            last_valuation_eur,
            price_source
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE
            SET amount = EXCLUDED.amount,
                book_cost_eur = EXCLUDED.book_cost_eur,
                last_valuation_eur = EXCLUDED.last_valuation_eur
        """,
        (
            position_id,
            user_id,
            account_id,
            symbol,
            asset_name,
            amount,
            book_cost,
            last_valuation,
            price_source,
        ),
    )


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


@pytest.fixture()
def cleanup_crypto_variation(sync_connection):
    """Pulisce la tabella crypto_variation prima e dopo il test."""
    with sync_connection.cursor() as cur:
        cur.execute("DELETE FROM crypto_variation;")
        sync_connection.commit()
    yield
    with sync_connection.cursor() as cur:
        cur.execute("DELETE FROM crypto_variation;")
        sync_connection.commit()


@pytest.mark.asyncio
async def test_market_prices_returns_snapshot(async_client, sync_connection, cleanup_crypto_variation, monkeypatch):
    """Verifica che /market/prices restituisca i dati provenienti dal client CoinCap."""

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
    async def fake_price(symbol: str):
        assert symbol == "BTC"
        return Decimal("999.1234")

    monkeypatch.setattr("backend.app.routes.market.coincap.fetch_market_snapshot", fake_snapshot)
    monkeypatch.setattr("backend.app.routes.market.coincap.fetch_price_by_symbol", fake_price)

    response = await async_client.get("/market/prices")

    assert response.status_code == 200, response.text
    payload = response.json()["data"]
    assert payload[0]["symbol"] == "BTC"
    assert payload[0]["price"] == float(Decimal("999.1234"))

    with sync_connection.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM crypto_variation WHERE price = %s;", (Decimal("999.1234"),))
        assert cur.fetchone()[0] == 1


@pytest.mark.asyncio
async def test_market_asset_includes_position_and_transactions(
    async_client,
    sync_connection,
    auth_headers_factory,
    cleanup_transactions,
    cleanup_crypto_positions,
    cleanup_crypto_variation,
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
    async def fake_snapshot():
        return sample_snapshot

    async def fake_history(asset_id: str, days: int = 7):
        raise AssertionError("CoinCap history should not be called when DB data is available.")

    monkeypatch.setattr("backend.app.routes.market.coincap.fetch_market_snapshot", fake_snapshot)
    monkeypatch.setattr("backend.app.routes.market.coincap.fetch_history", fake_history)

    position_id = str(uuid4())
    transaction_id = str(uuid4())
    now = datetime.now(timezone.utc)
    history_rows = [
        (Decimal("28000.00"), now - timedelta(days=6)),
        (Decimal("30050.00"), now - timedelta(days=3)),
        (Decimal("30500.00"), now),
    ]
    with sync_connection.cursor() as cur:
        cur.execute(
            """
            INSERT INTO crypto (id, symbol, name, rank, explorer_url)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE
            SET symbol = EXCLUDED.symbol,
                name = EXCLUDED.name,
                rank = EXCLUDED.rank,
                explorer_url = EXCLUDED.explorer_url
            """,
            ("bitcoin", "BTC", "Bitcoin", 1, "https://explorer.test/btc"),
        )
        for price, created_at in history_rows:
            cur.execute(
                """
                INSERT INTO crypto_variation (crypto_id, price, created_at)
                VALUES (%s, %s, %s)
                """,
                ("bitcoin", price, created_at),
            )
        insert_user_crypto_position(
            cur,
            position_id=position_id,
            user_id=DEFAULT_USER_ID,
            account_id=DEFAULT_ACCOUNT_ID,
            symbol="BTC",
            asset_name="Bitcoin",
            amount=Decimal("0.7500000000"),
            book_cost=Decimal("15000.00"),
            last_valuation=Decimal("18000.00"),
            price_source="test-suite",
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

    with sync_connection.cursor() as cur:
        cur.execute(
            """
            SELECT
                (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT AS ts_ms,
                price
            FROM crypto_variation
            WHERE crypto_id = %s
            ORDER BY created_at ASC
            """,
            ("bitcoin",),
        )
        expected_history = [
            {
                "timestamp": int(row[0]),
                "price": float(row[1]),
            }
            for row in cur.fetchall()
        ]

    headers = auth_headers_factory(user_id=DEFAULT_USER_ID, scopes={"accounts:read"})
    response = await async_client.get("/market/assets/bitcoin", headers=headers)

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["asset"]["id"] == "bitcoin"
    assert payload["asset"]["explorer_url"] == "https://explorer.test/btc"
    assert payload["history"] == expected_history
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


@pytest.mark.asyncio
async def test_market_order_sell_reduces_position_and_credits_account(
    async_client,
    sync_connection,
    auth_headers_factory,
    cleanup_transactions,
    cleanup_crypto_positions,
):
    """Un ordine di vendita deve ridurre la posizione e accreditare il saldo; a zero rimuove la row."""

    with sync_connection.cursor() as cur:
        cur.execute("UPDATE accounts SET balance = %s WHERE id = %s;", (Decimal("1000.00"), DEFAULT_ACCOUNT_ID))
        insert_user_crypto_position(
            cur,
            position_id=str(uuid4()),
            user_id=DEFAULT_USER_ID,
            account_id=DEFAULT_ACCOUNT_ID,
            symbol="BTC",
            asset_name="Bitcoin",
            amount=Decimal("0.0500"),
            book_cost=Decimal("500.00"),
            last_valuation=Decimal("1000.00"),
            price_source="test-suite",
        )
        sync_connection.commit()

    payload = {
        "account_id": DEFAULT_ACCOUNT_ID,
        "asset_symbol": "BTC",
        "asset_name": "Bitcoin",
        "price_eur": "30000.00",
        "quantity": "0.0500",
        "side": "sell",
    }
    headers = auth_headers_factory(user_id=DEFAULT_USER_ID, scopes={"transactions:write"})

    response = await async_client.post("/market/orders", headers=headers, json=payload)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["position"] is None

    with sync_connection.cursor() as cur:
        cur.execute("SELECT balance FROM accounts WHERE id = %s;", (DEFAULT_ACCOUNT_ID,))
        updated_balance = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM user_crypto_positions WHERE user_id = %s AND asset_symbol = %s;", (DEFAULT_USER_ID, "BTC"))
        remaining_positions = cur.fetchone()[0]

    expected_credit = Decimal(payload["quantity"]) * Decimal(payload["price_eur"])
    assert updated_balance == Decimal("1000.00") + expected_credit
    assert remaining_positions == 0
