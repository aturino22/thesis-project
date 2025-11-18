"""Gestione dei file di migrazione SQL applicati al database PostgreSQL."""

from __future__ import annotations

from pathlib import Path
from typing import List

MIGRATIONS_DIR = Path(__file__).resolve().parent

MIGRATION_FILES: List[Path] = [
    MIGRATIONS_DIR / "otp_channels_migration_21102025.sql",
    MIGRATIONS_DIR / "users_migration_21102025.sql",
    MIGRATIONS_DIR / "accounts_migration_21102025.sql",
    MIGRATIONS_DIR / "accounts_auto_creation_migration_18112025.sql",
    MIGRATIONS_DIR / "accounts_rls_migration_25102025.sql",
    MIGRATIONS_DIR / "account_topups_migration_18112025.sql",
    MIGRATIONS_DIR / "account_topups_rls_migration_18112025.sql",
    MIGRATIONS_DIR / "account_balances_migration_15112025.sql",
    MIGRATIONS_DIR / "transactions_migration_21102025.sql",
    MIGRATIONS_DIR / "transactions_rls_migration_25102025.sql",
    MIGRATIONS_DIR / "crypto_positions_migration_26102025.sql",
    MIGRATIONS_DIR / "crypto_positions_rls_migration_26102025.sql",
    MIGRATIONS_DIR / "otp_audits_migration_21102025.sql",
    MIGRATIONS_DIR / "otp_audits_rls_migration_25102025.sql",
    MIGRATIONS_DIR / "security_logs_migration_21102025.sql",
    MIGRATIONS_DIR / "security_logs_rls_migration_25102025.sql",
    MIGRATIONS_DIR / "crypto_market_migration_11112025.sql",
    MIGRATIONS_DIR / "withdrawal_methods_migration_15112025.sql",
    MIGRATIONS_DIR / "withdrawals_migration_15112025.sql",
]

__all__ = ["MIGRATION_FILES", "MIGRATIONS_DIR"]
