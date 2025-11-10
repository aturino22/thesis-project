"""Esegue in sequenza tutte le migrazioni SQL del progetto."""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List

import psycopg
from psycopg import errors
from dotenv import load_dotenv

from . import MIGRATION_FILES

DEFAULT_ENV_FILES = [
    Path(__file__).resolve().parents[3] / ".env",
    Path(__file__).resolve().parents[2] / ".env",
    Path(__file__).resolve().parents[2] / "backend" / ".env",
]


def load_environment() -> None:
    """Carica i file .env standard se disponibili senza sovrascrivere variabili esistenti."""
    for env_path in DEFAULT_ENV_FILES:
        load_dotenv(env_path, override=False)


def get_connection() -> psycopg.Connection:
    """
    Crea una connessione utilizzando le variabili d'ambiente standard del progetto.

    Restituisce:
        psycopg.Connection: Connessione aperta a PostgreSQL.
    """
    import os

    return psycopg.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "thesis_fintech"),
        user=os.getenv("DB_USER", "thesis_admin"),
        password=os.getenv("DB_PASSWORD", "thesis_admin"),
    )


@dataclass
class MigrationResult:
    """Risultato dell'esecuzione di una migrazione singola."""

    path: Path
    succeeded: bool
    error: Exception | None = None


def apply_migration(path: Path, conn: psycopg.Connection) -> MigrationResult:
    """
    Applica il contenuto SQL di una migrazione.

    Argomenti:
        path: Percorso del file SQL.
        conn: Connessione aperta verso il database.

    Restituisce:
        MigrationResult: Esito dell'operazione con eventuale eccezione.
    """
    sql = path.read_text(encoding="utf-8").strip()
    if not sql:
        return MigrationResult(path=path, succeeded=True)

    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    except (errors.DuplicateObject, errors.DuplicateTable, errors.DuplicateColumn):
        conn.rollback()
        return MigrationResult(path=path, succeeded=True)
    except Exception as exc:  # noqa: BLE001
        conn.rollback()
        return MigrationResult(path=path, succeeded=False, error=exc)
    return MigrationResult(path=path, succeeded=True)


def run_migrations(files: Iterable[Path]) -> List[MigrationResult]:
    """Esegue la lista di migrazioni passata in input."""
    load_environment()
    results: List[MigrationResult] = []
    with get_connection() as conn:
        for path in files:
            print(f"[MIGRATE] {path.name} ...", flush=True)
            result = apply_migration(path, conn)
            results.append(result)
            if result.succeeded:
                print(f"[DONE   ] {path.name}", flush=True)
            else:
                print(f"[FAILED ] {path.name}: {result.error}", flush=True)
                break
    return results


def main(custom_files: Iterable[Path] | None = None) -> int:
    """
    Entry point per eseguire tutte le migrazioni.

    Argomenti:
        custom_files: Lista opzionale di file da applicare.

    Restituisce:
        int: Codice 0 se tutte le migrazioni hanno successo, 1 in caso contrario.
    """
    files = list(custom_files or MIGRATION_FILES)
    results = run_migrations(files)
    failures = [res for res in results if not res.succeeded]
    if failures:
        print("\nEsecuzione migrazioni interrotta per errori.")
        return 1
    print("\nTutte le migrazioni sono state applicate correttamente.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
