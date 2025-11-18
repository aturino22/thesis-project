"""Test per gli endpoint della sezione profilo."""

from __future__ import annotations

import pytest

from backend.app.services.keycloak_admin import (
    InvalidUserCredentialsError,
    KeycloakAdminError,
    PasswordUpdateFailed,
    get_keycloak_admin_client,
)

DEFAULT_USER_ID = "aaaaaaaa-1111-2222-3333-444444444444"


class StubKeycloakAdmin:
    def __init__(self) -> None:
        self.verify_calls: list[tuple[str, str]] = []
        self.update_calls: list[tuple[str, str]] = []
        self.profile_calls: list[dict[str, str | None]] = []
        self.raise_on_verify: Exception | None = None
        self.raise_on_update: Exception | None = None
        self.raise_on_profile: Exception | None = None

    async def verify_user_credentials(self, *, username: str, password: str) -> None:
        self.verify_calls.append((username, password))
        if self.raise_on_verify:
            raise self.raise_on_verify

    async def set_user_password(self, *, user_id: str, new_password: str) -> None:
        self.update_calls.append((user_id, new_password))
        if self.raise_on_update:
            raise self.raise_on_update

    async def update_user_profile(
        self, *, user_id: str, first_name: str | None, last_name: str | None, email: str | None
    ) -> None:
        self.profile_calls.append(
            {"user_id": user_id, "first_name": first_name, "last_name": last_name, "email": email}
        )
        if self.raise_on_profile:
            raise self.raise_on_profile


@pytest.mark.asyncio
async def test_change_password_updates_credentials(async_client, auth_headers_factory):
    stub = StubKeycloakAdmin()
    async_client.app.dependency_overrides[get_keycloak_admin_client] = lambda: stub

    headers = auth_headers_factory(
        user_id=DEFAULT_USER_ID,
        extra_claims={"preferred_username": "demo-user"},
    )
    payload = {"currentPassword": "VecchiaPassword1!", "newPassword": "PasswordNuova2!"}

    response = await async_client.post("/profile/password", headers=headers, json=payload)

    async_client.app.dependency_overrides.clear()
    assert response.status_code == 204
    assert stub.verify_calls == [("demo-user", "VecchiaPassword1!")]
    assert stub.update_calls == [(DEFAULT_USER_ID, "PasswordNuova2!")]


@pytest.mark.asyncio
async def test_change_password_handles_invalid_current(async_client, auth_headers_factory):
    stub = StubKeycloakAdmin()
    stub.raise_on_verify = InvalidUserCredentialsError("invalid")
    async_client.app.dependency_overrides[get_keycloak_admin_client] = lambda: stub

    headers = auth_headers_factory(
        user_id=DEFAULT_USER_ID,
        extra_claims={"preferred_username": "demo-user"},
    )
    payload = {"currentPassword": "sbagliata", "newPassword": "PasswordCorretta3!"}

    response = await async_client.post("/profile/password", headers=headers, json=payload)

    async_client.app.dependency_overrides.clear()
    assert response.status_code == 400
    assert response.json()["detail"] == "La password corrente non è corretta."
    assert stub.update_calls == []


@pytest.mark.asyncio
async def test_change_password_handles_update_failure(async_client, auth_headers_factory):
    stub = StubKeycloakAdmin()
    stub.raise_on_update = PasswordUpdateFailed("errore")
    async_client.app.dependency_overrides[get_keycloak_admin_client] = lambda: stub

    headers = auth_headers_factory(
        user_id=DEFAULT_USER_ID,
        extra_claims={"preferred_username": "demo-user"},
    )
    payload = {"currentPassword": "PasswordCorretta!", "newPassword": "PasswordNuova2!"}

    response = await async_client.post("/profile/password", headers=headers, json=payload)

    async_client.app.dependency_overrides.clear()
    assert response.status_code == 502
    assert "Impossibile aggiornare la password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_change_password_requires_username(async_client, auth_headers_factory):
    stub = StubKeycloakAdmin()
    async_client.app.dependency_overrides[get_keycloak_admin_client] = lambda: stub

    headers = auth_headers_factory(user_id=DEFAULT_USER_ID)
    payload = {"currentPassword": "qualcosa", "newPassword": "PasswordNuova2!"}

    response = await async_client.post("/profile/password", headers=headers, json=payload)

    async_client.app.dependency_overrides.clear()
    assert response.status_code == 400
    assert "username" in response.json()["detail"].lower()
    assert stub.verify_calls == []


@pytest.mark.asyncio
async def test_update_profile_calls_keycloak(async_client, auth_headers_factory):
    stub = StubKeycloakAdmin()
    async_client.app.dependency_overrides[get_keycloak_admin_client] = lambda: stub

    headers = auth_headers_factory(
        user_id=DEFAULT_USER_ID,
        extra_claims={"sub": DEFAULT_USER_ID, "preferred_username": "demo-user"},
    )
    payload = {"firstName": "Mario", "lastName": "Rossi", "email": "mario.rossi@example.com"}

    response = await async_client.put("/profile", headers=headers, json=payload)

    async_client.app.dependency_overrides.clear()
    assert response.status_code == 204
    assert stub.profile_calls == [
        {
            "user_id": DEFAULT_USER_ID,
            "first_name": "Mario",
            "last_name": "Rossi",
            "email": "mario.rossi@example.com",
        }
    ]


@pytest.mark.asyncio
async def test_update_profile_handles_backend_error(async_client, auth_headers_factory):
    stub = StubKeycloakAdmin()
    stub.raise_on_profile = KeycloakAdminError("boom")
    async_client.app.dependency_overrides[get_keycloak_admin_client] = lambda: stub

    headers = auth_headers_factory(
        user_id=DEFAULT_USER_ID,
        extra_claims={"sub": DEFAULT_USER_ID},
    )
    response = await async_client.put("/profile", headers=headers, json={"firstName": "Test"})

    async_client.app.dependency_overrides.clear()
    assert response.status_code == 502


@pytest.mark.asyncio
async def test_update_profile_with_partial_payload(async_client, auth_headers_factory):
    stub = StubKeycloakAdmin()
    async_client.app.dependency_overrides[get_keycloak_admin_client] = lambda: stub

    headers = auth_headers_factory(
        user_id=DEFAULT_USER_ID,
        extra_claims={"sub": DEFAULT_USER_ID},
    )
    payload = {"firstName": "OnlyName"}

    response = await async_client.put("/profile", headers=headers, json=payload)

    async_client.app.dependency_overrides.clear()
    assert response.status_code == 204
    assert stub.profile_calls == [
        {"user_id": DEFAULT_USER_ID, "first_name": "OnlyName", "last_name": None, "email": None}
    ]
