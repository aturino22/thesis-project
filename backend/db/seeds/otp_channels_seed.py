from __future__ import annotations

import os
from datetime import datetime

import psycopg


CHANNELS = [
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "code": "SMS",
        "description": "Short Message Service",
        "is_active": True,
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "code": "EMAIL",
        "description": "Email delivery channel",
        "is_active": True,
    },
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
    Inserisce o aggiorna i canali OTP di fixture mantenendo l'operazione idempotente.

    Restituisce:
        None: Stampa a schermo l'esito dell'attività senza restituire valori.
    """
    now = datetime.utcnow()
    with get_connection() as conn:
        with conn.cursor() as cur:
            for channel in CHANNELS:
                cur.execute(
                    """
                    INSERT INTO otp_channels (id, code, description, is_active, created_at)
                    VALUES (%(id)s, %(code)s, %(description)s, %(is_active)s, %(created_at)s)
                    ON CONFLICT (id) DO UPDATE
                        SET code = EXCLUDED.code,
                            description = EXCLUDED.description,
                            is_active = EXCLUDED.is_active;
                    """,
                    {
                        **channel,
                        "created_at": now,
                    },
                )
    print("Seeded otp_channels.")


if __name__ == "__main__":
    seed()
