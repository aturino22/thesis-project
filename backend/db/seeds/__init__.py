"""Moduli di seed per inizializzare il database PostgreSQL."""

from importlib import import_module
from types import ModuleType
from typing import Iterable, List

__all__ = [
    "SEED_MODULE_PATHS",
    "iter_seed_modules",
]

SEED_MODULE_PATHS: List[str] = [
    "backend.db.seeds.otp_channels_seed",
    "backend.db.seeds.users_seed",
    "backend.db.seeds.accounts_seed",
    "backend.db.seeds.transactions_seed",
    "backend.db.seeds.otp_audits_seed",
    "backend.db.seeds.security_logs_seed",
]


def iter_seed_modules(module_paths: Iterable[str] | None = None) -> Iterable[ModuleType]:
    """
    Restituisce i moduli di seed importati nell'ordine configurato.

    Argomenti:
        module_paths: Iterable opzionale che sostituisce l'elenco predefinito dei moduli.

    Restituisce:
        Iterable[ModuleType]: Iteratore lazy sui moduli seed importati.
    """
    for path in module_paths or SEED_MODULE_PATHS:
        yield import_module(path)
