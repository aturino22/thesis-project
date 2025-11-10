"""Test di integrazione per gli endpoint dei conti."""

from __future__ import annotations

import pytest

DEFAULT_USER_ID = "aaaaaaaa-1111-2222-3333-444444444444"


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
    assert any(account["id"] == "bbbbbbbb-1111-2222-3333-555555555555" for account in payload["data"])
