"""Test di integrazione per gli endpoint dei conti."""

from __future__ import annotations

from decimal import Decimal

import pytest

DEFAULT_USER_ID = "aaaaaaaa-1111-2222-3333-444444444444"
DEFAULT_ACCOUNT_ID = "bbbbbbbb-1111-2222-3333-555555555555"


@pytest.mark.asyncio
async def test_list_accounts_returns_seeded_account(async_client, auth_headers_factory):
    """Verifica che l'endpoint dei conti restituisca i dati seed dell'utente demo."""
    headers = auth_headers_factory(user_id=DEFAULT_USER_ID, scopes={"accounts:read"})
    response = await async_client.get(
        "/accounts",
        headers=headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert "data" in payload
    assert any(account["id"] == DEFAULT_ACCOUNT_ID for account in payload["data"])


@pytest.mark.asyncio
async def test_account_topup_increases_balance(async_client, auth_headers_factory, sync_connection):
    """La ricarica del saldo incrementa il conto selezionato."""
    with sync_connection.cursor() as cur:
        cur.execute("UPDATE accounts SET balance = %s WHERE id = %s;", (Decimal("100.00"), DEFAULT_ACCOUNT_ID))
        sync_connection.commit()

    headers = auth_headers_factory(user_id=DEFAULT_USER_ID, scopes={"transactions:write"})
    response = await async_client.post(
        f"/accounts/{DEFAULT_ACCOUNT_ID}/topup",
        headers=headers,
        json={"amount": "50.00"},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["id"] == DEFAULT_ACCOUNT_ID
    assert Decimal(payload["balance"]) == Decimal("150.00")
