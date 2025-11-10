"""Test di integrazione per gli endpoint delle transazioni."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import uuid4

import pytest

DEFAULT_USER_ID = "aaaaaaaa-1111-2222-3333-444444444444"
DEFAULT_ACCOUNT_ID = "bbbbbbbb-1111-2222-3333-555555555555"
SECONDARY_USER_ID = "cccccccc-1111-2222-3333-666666666666"
SECONDARY_ACCOUNT_ID = "dddddddd-1111-2222-3333-777777777777"
OTP_EMAIL_CHANNEL_ID = "22222222-2222-2222-2222-222222222222"


def ensure_secondary_user_with_account(conn) -> None:
    """Crea/aggiorna un utente secondario e il relativo conto di appoggio."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (id, email, nome, cognome, birthday, preferred_otp_channel)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE
                SET email = EXCLUDED.email,
                    nome = EXCLUDED.nome,
                    cognome = EXCLUDED.cognome,
                    birthday = EXCLUDED.birthday,
                    preferred_otp_channel = EXCLUDED.preferred_otp_channel;
            """,
            (
                SECONDARY_USER_ID,
                "beta.user@example.com",
                "Beta",
                "User",
                date(1990, 1, 1),
                OTP_EMAIL_CHANNEL_ID,
            ),
        )
        cur.execute(
            """
            INSERT INTO accounts (id, user_id, currency, balance, name)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE
                SET currency = EXCLUDED.currency,
                    balance = EXCLUDED.balance,
                    name = EXCLUDED.name;
            """,
            (
                SECONDARY_ACCOUNT_ID,
                SECONDARY_USER_ID,
                "EUR",
                Decimal("500.00"),
                "beta.user",
            ),
        )
    conn.commit()


@pytest.mark.asyncio
async def test_list_transactions_returns_inserted_rows(
    async_client,
    sync_connection,
    cleanup_transactions,
    auth_headers_factory,
):
    """Verifica che l'elenco transazioni includa le righe inserite manualmente."""
    transaction_id = str(uuid4())
    with sync_connection.cursor() as cur:
        cur.execute(
            """
            INSERT INTO transactions (id, user_id, account_id, amount, currency, category, idem_key, direction, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                transaction_id,
                DEFAULT_USER_ID,
                DEFAULT_ACCOUNT_ID,
                Decimal("42.50"),
                "EUR",
                "shopping",
                str(uuid4()),
                "buy",
                datetime.utcnow(),
            ),
        )
        sync_connection.commit()

    headers = auth_headers_factory(user_id=DEFAULT_USER_ID, scopes={"transactions:read"})
    response = await async_client.get(
        "/transactions",
        headers=headers,
        params={"category": "shopping"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert any(item["id"] == transaction_id for item in payload.get("data", []))


@pytest.mark.asyncio
async def test_create_transaction_supports_idempotency(async_client, cleanup_transactions, auth_headers_factory):
    """Controlla che la creazione della transazione sia idempotente con la stessa idem_key."""
    payload = {
        "account_id": DEFAULT_ACCOUNT_ID,
        "amount": "100.00",
        "currency": "EUR",
        "category": "bonus",
        "direction": "buy",
        "idem_key": str(uuid4()),
    }

    headers = auth_headers_factory(
        user_id=DEFAULT_USER_ID,
        scopes={"transactions:write", "transactions:read"},
    )
    first_response = await async_client.post(
        "/transactions",
        headers=headers,
        json=payload,
    )
    assert first_response.status_code == 201
    first_payload = first_response.json()["data"]

    second_response = await async_client.post(
        "/transactions",
        headers=headers,
        json=payload,
    )
    assert second_response.status_code == 200
    second_payload = second_response.json()["data"]

    assert first_payload["id"] == second_payload["id"]
    assert first_payload["idem_key"] == payload["idem_key"]


@pytest.mark.asyncio
async def test_list_transactions_respects_rls(
    async_client,
    sync_connection,
    cleanup_transactions,
    auth_headers_factory,
):
    """Verifica che transazioni di utenti diversi restino isolate via RLS."""
    ensure_secondary_user_with_account(sync_connection)
    foreign_transaction_id = str(uuid4())
    with sync_connection.cursor() as cur:
        cur.execute(
            """
            INSERT INTO transactions (id, user_id, account_id, amount, currency, category, idem_key, direction, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                foreign_transaction_id,
                SECONDARY_USER_ID,
                SECONDARY_ACCOUNT_ID,
                Decimal("10.00"),
                "EUR",
                "coffee",
                str(uuid4()),
                "buy",
                datetime.utcnow(),
            ),
    )
    sync_connection.commit()

    secondary_headers = auth_headers_factory(
        user_id=SECONDARY_USER_ID,
        scopes={"transactions:read"},
    )
    primary_headers = auth_headers_factory(
        user_id=DEFAULT_USER_ID,
        scopes={"transactions:read"},
    )
    secondary_response = await async_client.get(
        "/transactions",
        headers=secondary_headers,
    )
    primary_response = await async_client.get(
        "/transactions",
        headers=primary_headers,
    )

    assert secondary_response.status_code == 200
    assert any(item["id"] == foreign_transaction_id for item in secondary_response.json().get("data", []))

    assert primary_response.status_code == 200
    assert all(item["id"] != foreign_transaction_id for item in primary_response.json().get("data", []))
