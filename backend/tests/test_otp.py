"""Test per l'endpoint di invio OTP."""

from __future__ import annotations

import pytest

from backend.app.config import get_settings
from backend.app.services.otp_client import OtpServiceError
from backend.tests.conftest import DEFAULT_TEST_USER_ID


@pytest.mark.asyncio
async def test_send_otp_email_success(
    async_client,
    auth_headers_factory,
    monkeypatch,
    sync_connection,
    cleanup_otp_audits,
):
    monkeypatch.setenv("OTP_SERVICE_BASE_URL", "http://otp-service")
    get_settings.cache_clear()

    dispatched: list[dict[str, object]] = []

    async def fake_dispatch(self, payload):  # type: ignore[override]
        dispatched.append(payload)

    monkeypatch.setattr("backend.app.services.otp_client.OtpServiceClient.dispatch", fake_dispatch, raising=False)

    headers = auth_headers_factory(user_id=DEFAULT_TEST_USER_ID)
    response = await async_client.post("/otp/send", headers=headers, json={})

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "sent"
    assert body["channel_code"] == "EMAIL"
    assert dispatched and dispatched[0]["channel"] == "EMAIL"

    with sync_connection.cursor() as cur:
        cur.execute("SELECT set_config('app.current_user_id', %s, true);", (DEFAULT_TEST_USER_ID,))
        cur.execute("SELECT status FROM otp_audits ORDER BY attempted_at DESC LIMIT 1;")
        row = cur.fetchone()
    assert row is not None and row[0] == "success"

    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_send_otp_failure_records_audit(
    async_client,
    auth_headers_factory,
    monkeypatch,
    sync_connection,
    cleanup_otp_audits,
):
    monkeypatch.setenv("OTP_SERVICE_BASE_URL", "http://otp-service")
    get_settings.cache_clear()

    async def fake_dispatch(self, payload):  # type: ignore[override]
        raise OtpServiceError("service down")

    monkeypatch.setattr("backend.app.services.otp_client.OtpServiceClient.dispatch", fake_dispatch, raising=False)

    headers = auth_headers_factory(user_id=DEFAULT_TEST_USER_ID)
    response = await async_client.post("/otp/send", headers=headers, json={})

    assert response.status_code == 502

    with sync_connection.cursor() as cur:
        cur.execute("SELECT set_config('app.current_user_id', %s, true);", (DEFAULT_TEST_USER_ID,))
        cur.execute("SELECT status FROM otp_audits ORDER BY attempted_at DESC LIMIT 1;")
        row = cur.fetchone()
    assert row is not None and row[0] == "failed"

    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_send_otp_requires_destination_for_sms(async_client, auth_headers_factory, monkeypatch):
    monkeypatch.setenv("OTP_SERVICE_BASE_URL", "http://otp-service")
    get_settings.cache_clear()

    headers = auth_headers_factory(user_id=DEFAULT_TEST_USER_ID)
    response = await async_client.post(
        "/otp/send",
        headers=headers,
        json={"channel_code": "SMS"},
    )

    assert response.status_code == 400
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_send_otp_sms_success(
    async_client,
    auth_headers_factory,
    monkeypatch,
    sync_connection,
    cleanup_otp_audits,
):
    monkeypatch.setenv("OTP_SERVICE_BASE_URL", "http://otp-service")
    get_settings.cache_clear()

    dispatched: list[dict[str, object]] = []

    async def fake_dispatch(self, payload):  # type: ignore[override]
        dispatched.append(payload)

    monkeypatch.setattr("backend.app.services.otp_client.OtpServiceClient.dispatch", fake_dispatch, raising=False)

    headers = auth_headers_factory(user_id=DEFAULT_TEST_USER_ID)
    response = await async_client.post(
        "/otp/send",
        headers=headers,
        json={"channel_code": "SMS", "destination": "+390000000000"},
    )

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "sent"
    assert body["channel_code"] == "SMS"
    assert dispatched and dispatched[0]["channel"] == "SMS"
    assert dispatched[0]["phone_number"] == "+390000000000"

    with sync_connection.cursor() as cur:
        cur.execute("SELECT set_config('app.current_user_id', %s, true);", (DEFAULT_TEST_USER_ID,))
        cur.execute("SELECT status FROM otp_audits ORDER BY attempted_at DESC LIMIT 1;")
        row = cur.fetchone()
    assert row is not None and row[0] == "success"

    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_send_otp_email_missing_address_returns_400(
    async_client,
    auth_headers_factory,
    monkeypatch,
    sync_connection,
):
    monkeypatch.setenv("OTP_SERVICE_BASE_URL", "http://otp-service")
    get_settings.cache_clear()

    with sync_connection.cursor() as cur:
        cur.execute("SELECT email FROM users WHERE id = %s;", (DEFAULT_TEST_USER_ID,))
        original_email = cur.fetchone()[0]
        cur.execute("UPDATE users SET email = %s WHERE id = %s;", ("", DEFAULT_TEST_USER_ID))
        sync_connection.commit()

    try:
        headers = auth_headers_factory(user_id=DEFAULT_TEST_USER_ID)
        response = await async_client.post("/otp/send", headers=headers, json={"channel_code": "EMAIL"})
        assert response.status_code == 400
    finally:
        with sync_connection.cursor() as cur:
            cur.execute("UPDATE users SET email = %s WHERE id = %s;", (original_email, DEFAULT_TEST_USER_ID))
            sync_connection.commit()
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_send_otp_requires_authorization(async_client):
    response = await async_client.post("/otp/send", json={})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_send_otp_requires_scope(async_client, auth_headers_factory, monkeypatch):
    monkeypatch.setenv("OTP_SERVICE_BASE_URL", "http://otp-service")
    get_settings.cache_clear()

    headers = auth_headers_factory(user_id=DEFAULT_TEST_USER_ID, scopes=("accounts:read",))
    response = await async_client.post("/otp/send", headers=headers, json={})

    assert response.status_code == 403
    get_settings.cache_clear()
