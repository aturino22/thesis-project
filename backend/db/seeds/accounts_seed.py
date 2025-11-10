from __future__ import annotations

import os
from decimal import Decimal
from datetime import datetime

import psycopg


ACCOUNTS = [
    {
        "id": "bbbbbbbb-1111-2222-3333-555555555555",
        "user_id": "aaaaaaaa-1111-2222-3333-444444444444",
        "currency": "EUR",
        "balance": Decimal("1000.00"),
        "name": "a.turino",
    }
]


def get_connection() -> psycopg.Connection:
    """
    Crea una connessione al database applicando eventuali override dalle variabili d'ambiente.

    Restituisce:
        psycopg.Connection: Connessione aperta verso il database usato dai seed.
    """
    return psycopg.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "thesis_fintech"),
        user=os.getenv("DB_USER", "thesis_admin"),
        password=os.getenv("DB_PASSWORD", "thesis_admin"),
    )


def seed() -> None:
    """
    Inserisce o aggiorna gli account di fixture mantenendo l'operazione idempotente.

    Restituisce:
        None: Stampa a schermo l'esito dell'attività senza restituire valori.
    """
    now = datetime.utcnow()
    with get_connection() as conn:
        with conn.cursor() as cur:
            for account in ACCOUNTS:
                cur.execute(
                    """
                    INSERT INTO accounts (id, user_id, currency, balance, name, created_at)
                    VALUES (%(id)s, %(user_id)s, %(currency)s, %(balance)s, %(name)s, %(created_at)s)
                    ON CONFLICT (id) DO UPDATE
                        SET currency = EXCLUDED.currency,
                            balance = EXCLUDED.balance,
                            name = EXCLUDED.name;
                    """,
                    {
                        **account,
                        "created_at": now,
                    },
                )
    print("Seeded accounts.")


if __name__ == "__main__":
    seed()
