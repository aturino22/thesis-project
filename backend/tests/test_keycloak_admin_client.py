"""Test mirati alla configurazione del client admin di Keycloak."""

from __future__ import annotations

from backend.app.config import get_settings, Settings
from backend.app.services.keycloak_admin import KeycloakAdminClient


def test_keycloak_admin_client_falls_back_to_public_client_id():
    """Il client deve inizializzarsi anche senza KEYCLOAK_ADMIN_CLIENT_ID esplicito."""
    settings = Settings(
        keycloak_admin_client_id=None,
        keycloak_public_client_id="frontend-public",
        keycloak_base_url="http://keycloak:8080",
        keycloak_realm="thesis",
        keycloak_admin_username="admin",
        keycloak_admin_password="admin",
    )

    client = KeycloakAdminClient(settings)

    assert client._client_id == "frontend-public"


def test_settings_read_kc_admin_env_alias(monkeypatch):
    """Le variabili KC_ADMIN_* devono essere accettate come alias."""
    monkeypatch.setenv("KC_ADMIN_USER", "kc-user@example.com")
    monkeypatch.setenv("KC_ADMIN_PASSWORD", "kc-pass")
    monkeypatch.delenv("KEYCLOAK_ADMIN_USERNAME", raising=False)
    monkeypatch.delenv("KEYCLOAK_ADMIN_PASSWORD", raising=False)
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.keycloak_admin_username == "kc-user@example.com"
    assert settings.keycloak_admin_password == "kc-pass"

    get_settings.cache_clear()
