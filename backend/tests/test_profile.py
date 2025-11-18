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
DELETE_TEST_USER_ID = "eeeeeeee-1111-2222-3333-999999999999"


def _ensure_user_with_account(conn, user_id: str, email: str) -> None:
    with conn.cursor() as cur:
        username = email.split("@")[0]
        cur.execute("SELECT set_config('app.current_username', %s, true);", (username,))
        cur.execute(
            """
            INSERT INTO users (id, email, nome, cognome, created_at)
            VALUES (%s, %s, %s, %s, NOW())
            ON CONFLICT (id) DO NOTHING;
            """,
            (user_id, email, "Test", "User"),
        )
        cur.execute("DELETE FROM accounts WHERE user_id = %s;", (user_id,))
        cur.execute(
            """
            INSERT INTO accounts (user_id, currency, balance, name, created_at)
            VALUES (%s, 'EUR', 0, %s, NOW());
            """,
            (user_id, email.split("@")[0]),
        )
        cur.execute("SELECT set_config('app.current_username', '', true);")
    conn.commit()


def _user_exists(conn, user_id: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM users WHERE id = %s;", (user_id,))
        return cur.fetchone() is not None


def _cleanup_user(conn, user_id: str) -> None:
    with conn.cursor() as cur:
        cur.execute("DELETE FROM users WHERE id = %s;", (user_id,))
    conn.commit()


class StubKeycloakAdmin:
    def __init__(self) -> None:
        self.verify_calls: list[tuple[str, str]] = []
        self.update_calls: list[tuple[str, str]] = []
        self.profile_calls: list[dict[str, str | None]] = []
        self.delete_calls: list[str] = []
        self.raise_on_verify: Exception | None = None
        self.raise_on_update: Exception | None = None
        self.raise_on_profile: Exception | None = None
        self.raise_on_delete: Exception | None = None

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

    async def delete_user(self, *, user_id: str) -> None:
        self.delete_calls.append(user_id)
        if self.raise_on_delete:
            raise self.raise_on_delete


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


@pytest.mark.asyncio
async def test_delete_profile_removes_user(async_client, auth_headers_factory, sync_connection):
    stub = StubKeycloakAdmin()
    async_client.app.dependency_overrides[get_keycloak_admin_client] = lambda: stub
    _ensure_user_with_account(sync_connection, DELETE_TEST_USER_ID, "delete.user@example.com")

    headers = auth_headers_factory(
        user_id=DELETE_TEST_USER_ID,
        extra_claims={"sub": DELETE_TEST_USER_ID, "preferred_username": "delete-user"},
    )

    response = await async_client.request(
        "DELETE",
        "/profile",
        headers=headers,
        json={"currentPassword": "PasswordAttuale!"},
    )

    async_client.app.dependency_overrides.clear()
    assert response.status_code == 204
    assert stub.verify_calls == [("delete-user", "PasswordAttuale!")]
    assert stub.delete_calls == [DELETE_TEST_USER_ID]
    assert not _user_exists(sync_connection, DELETE_TEST_USER_ID)
    _cleanup_user(sync_connection, DELETE_TEST_USER_ID)


@pytest.mark.asyncio
async def test_delete_profile_with_wrong_password(async_client, auth_headers_factory, sync_connection):
    stub = StubKeycloakAdmin()
    stub.raise_on_verify = InvalidUserCredentialsError("invalid")
    async_client.app.dependency_overrides[get_keycloak_admin_client] = lambda: stub
    _ensure_user_with_account(sync_connection, DELETE_TEST_USER_ID, "delete.user@example.com")

    headers = auth_headers_factory(
        user_id=DELETE_TEST_USER_ID,
        extra_claims={"sub": DELETE_TEST_USER_ID, "preferred_username": "delete-user"},
    )

    response = await async_client.request(
        "DELETE",
        "/profile",
        headers=headers,
        json={"currentPassword": "sbagliata"},
    )

    async_client.app.dependency_overrides.clear()
    assert response.status_code == 400
    assert _user_exists(sync_connection, DELETE_TEST_USER_ID)
    _cleanup_user(sync_connection, DELETE_TEST_USER_ID)
