"""Gestione della configurazione dell'applicazione."""

from functools import lru_cache
from typing import Any

from psycopg import conninfo
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Rappresenta la configurazione applicativa derivata dalle variabili d'ambiente."""

    app_name: str = "Fintech Thesis API"
    environment: str = "development"
    debug: bool = True

    db_host: str = "127.0.0.1"
    db_port: int = 5432
    db_name: str = "thesis_fintech"
    db_user: str = "thesis_admin"
    db_password: str = "thesis_admin"
    db_pool_min_size: int = 1
    db_pool_max_size: int = 10
    db_pool_timeout: float = 30.0

    oidc_enabled: bool = False
    oidc_issuer: str | None = None
    oidc_client_id: str | None = None
    oidc_audience: str | None = None
    oidc_jwks_url: str | None = None
    oidc_user_id_claim: str = "sub"
    oidc_jwks_cache_ttl_seconds: int = 300
    oidc_clock_skew_seconds: int = 60
    oidc_dev_default_scopes: str = (
        "accounts:read transactions:read transactions:write crypto:read payouts:read payouts:write"
    )

    otp_service_base_url: str | None = None
    otp_service_timeout_seconds: float = 5.0
    otp_code_ttl_seconds: int = 60
    cors_allowed_origins: str = "http://localhost:5173"
    coincap_base_url: str = "https://api.coincap.io/v2"
    coincap_api_key: str | None = None

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    def database_conninfo(self) -> str:
        """
        Costruisce la stringa DSN per psycopg utilizzando le impostazioni correnti.

        Restituisce:
            str: Stringa di connessione utilizzata da psycopg.
        """
        return conninfo.make_conninfo(
            host=self.db_host,
            port=self.db_port,
            dbname=self.db_name,
            user=self.db_user,
            password=self.db_password,
        )

    def pool_kwargs(self) -> dict[str, Any]:
        """
        Fornisce i parametri keyword necessari a configurare il pool asincrono.

        Restituisce:
            dict[str, Any]: Limiti del pool come dimensioni e timeout.
        """
        return {
            "min_size": self.db_pool_min_size,
            "max_size": self.db_pool_max_size,
            "timeout": self.db_pool_timeout,
        }

    def oidc_is_configured(self) -> bool:
        """
        Indica se l'applicazione dispone dei parametri necessari per verificare i token OIDC.

        Restituisce:
            bool: True se la configurazione è completa e l'integrazione può essere attivata.
        """
        return bool(
            self.oidc_enabled
            and self.oidc_issuer
            and self.oidc_client_id
            and self.oidc_jwks_url
        )

    def oidc_default_scope_set(self) -> set[str]:
        """
        Restituisce l'insieme di scope da utilizzare quando l'OIDC è disabilitato (es. sviluppo).

        Restituisce:
            set[str]: Collezione di scope separati da spazio configurati nella variabile dedicata.
        """
        return {scope for scope in self.oidc_dev_default_scopes.split() if scope}

    def otp_service_is_configured(self) -> bool:
        """
        Indica se il microservizio OTP risulta configurato.

        Restituisce:
            bool: True se il base URL del servizio è definito.
        """
        return bool(self.otp_service_base_url)

    def cors_allowed_origins_list(self) -> list[str]:
        """
        Restituisce la lista di origini abilitate per il CORS.

        Restituisce:
            list[str]: Origini separate da virgola presenti nella configurazione.
        """
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Restituisce un'istanza cache della configurazione applicativa.

    Restituisce:
        Settings: Oggetto singleton con eventuali override da variabili d'ambiente.
    """
    return Settings()
