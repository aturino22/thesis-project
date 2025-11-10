"""Application configuration for the OTP delivery service."""

from __future__ import annotations

from functools import lru_cache

from pydantic import EmailStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings loaded from environment variables."""

    app_name: str = "OTP Delivery Service"
    debug: bool = False

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    email_from: EmailStr = "no-reply@localhost.localdomain"

    sms_log_file: str | None = None
    sms_sender_id: str = "Fintech"

    otp_code_ttl_seconds: int = 60

    model_config = SettingsConfigDict(
        env_prefix="OTP_",
        env_file=(".env",),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance."""

    return Settings()
