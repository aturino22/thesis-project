"""Fixture condivise per i test del backend FastAPI."""

from __future__ import annotations

import base64
import json
import os
import sys
from collections.abc import AsyncIterator, Iterator
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Iterable

import jwt
import psycopg
import pytest
import pytest_asyncio
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from httpx import ASGITransport, AsyncClient

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from backend.app.config import get_settings
from backend.app.main import create_app
from backend.db.seeds.run_all import main as run_seeds

TEST_BASE_URL = "http://testserver"
DEFAULT_TEST_SCOPES = ("accounts:read", "transactions:read", "transactions:write")
DEFAULT_TEST_USER_ID = "aaaaaaaa-1111-2222-3333-444444444444"


def _base64url_uint(value: int) -> str:
    length = (value.bit_length() + 7) // 8
    return base64.urlsafe_b64encode(value.to_bytes(length, "big")).rstrip(b"=").decode("ascii")


@pytest.fixture(scope="session")
def oidc_test_keys(tmp_path_factory: pytest.TempPathFactory) -> dict[str, Any]:
    """Genera una coppia di chiavi RSA e la JWKS da utilizzare nei test."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_numbers = private_key.public_key().public_numbers()
    kid = "test-signing-key"
    jwk = {
        "kty": "RSA",
        "use": "sig",
        "alg": "RS256",
        "kid": kid,
        "n": _base64url_uint(public_numbers.n),
        "e": _base64url_uint(public_numbers.e),
    }
    jwks_dir = tmp_path_factory.mktemp("oidc")
    jwks_path = jwks_dir / "jwks.json"
    jwks_path.write_text(json.dumps({"keys": [jwk]}), encoding="utf-8")
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")
    return {
        "issuer": "https://keycloak.test/realms/thesis",
        "audience": "fintech-backend",
        "kid": kid,
        "jwks_path": str(jwks_path),
        "private_key": private_pem,
    }


@pytest.fixture(scope="session", autouse=True)
def configure_oidc_env(oidc_test_keys: dict[str, Any]) -> Iterator[None]:
    """
    Configura le variabili d'ambiente OIDC necessarie ai test e invalida la cache di Settings.
    """
    os.environ["OIDC_ENABLED"] = "true"
    os.environ["OIDC_ISSUER"] = oidc_test_keys["issuer"]
    os.environ["OIDC_AUDIENCE"] = oidc_test_keys["audience"]
    os.environ["OIDC_JWKS_URL"] = oidc_test_keys["jwks_path"]
    get_settings.cache_clear()
    yield
    for var in ("OIDC_ENABLED", "OIDC_ISSUER", "OIDC_AUDIENCE", "OIDC_JWKS_URL"):
        os.environ.pop(var, None)
    get_settings.cache_clear()


@pytest.fixture()
def auth_headers_factory(oidc_test_keys: dict[str, Any]) -> Callable[..., dict[str, str]]:
    """
    Ritorna una factory per creare intestazioni Authorization con access token firmati.
    """

    def _build(
        *,
        user_id: str,
        scopes: Iterable[str] | None = None,
        extra_claims: dict[str, Any] | None = None,
    ) -> dict[str, str]:
        issuance = datetime.utcnow()
        scope_set = {scope for scope in (scopes or DEFAULT_TEST_SCOPES)}
        payload: dict[str, Any] = {
            "iss": oidc_test_keys["issuer"],
            "sub": user_id,
            "aud": oidc_test_keys["audience"],
            "iat": int(issuance.timestamp()),
            "exp": int((issuance + timedelta(minutes=5)).timestamp()),
        }
        if scope_set:
            payload["scope"] = " ".join(sorted(scope_set))
        if extra_claims:
            payload.update(extra_claims)
        token = jwt.encode(
            payload,
            oidc_test_keys["private_key"],
            algorithm="RS256",
            headers={"kid": oidc_test_keys["kid"]},
        )
        return {"Authorization": f"Bearer {token}"}

    return _build


@pytest.fixture(scope="session", autouse=True)
def apply_seed_data() -> Iterator[None]:
    """
    Applica i seed applicativi prima dell'esecuzione dell'intera suite di test.

    Restituisce:
        Iterator[None]: Generatore che garantisce l'esecuzione dei seed una sola volta.
    """
    run_seeds()
    yield


@pytest.fixture(scope="session")
def sync_connection() -> Iterator[psycopg.Connection]:
    """
    Fornisce una connessione sincrona utile ai test per preparare i dati manualmente.

    Restituisce:
        Iterator[psycopg.Connection]: Connessione attiva verso il database di test.
    """
    conn = psycopg.connect(
        host="postgres",
        port="5432",
        dbname="thesis_fintech",
        user="thesis_admin",
        password="thesis_admin",
    )
    try:
        yield conn
    finally:
        conn.close()


@pytest_asyncio.fixture()
async def async_client(configure_oidc_env: None) -> AsyncIterator[AsyncClient]:
    """
    Restituisce un client HTTP asincrono collegato all'app FastAPI di test.

    Restituisce:
        AsyncIterator[AsyncClient]: Client configurato con transport ASGI interno.
    """
    app = create_app()
    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url=TEST_BASE_URL) as client:
            yield client


@pytest.fixture()
def cleanup_transactions(sync_connection: psycopg.Connection) -> Iterator[None]:
    """
    Ripulisce la tabella delle transazioni prima e dopo ogni test che la modifica.

    Restituisce:
        Iterator[None]: Contesto che esegue l'operazione di cleanup.
    """
    with sync_connection.cursor() as cur:
        cur.execute("DELETE FROM transactions;")
        sync_connection.commit()
    yield
    with sync_connection.cursor() as cur:
        cur.execute("DELETE FROM transactions;")
        sync_connection.commit()


@pytest.fixture()
def cleanup_otp_audits(sync_connection: psycopg.Connection) -> Iterator[None]:
    """
    Ripulisce gli audit OTP prima e dopo l'esecuzione del test.
    """

    with sync_connection.cursor() as cur:
        cur.execute("SELECT set_config('app.current_user_id', %s, true);", (DEFAULT_TEST_USER_ID,))
        cur.execute("DELETE FROM otp_audits;")
        sync_connection.commit()
    yield
    with sync_connection.cursor() as cur:
        cur.execute("SELECT set_config('app.current_user_id', %s, true);", (DEFAULT_TEST_USER_ID,))
        cur.execute("DELETE FROM otp_audits;")
        sync_connection.commit()
