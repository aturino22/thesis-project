from __future__ import annotations

import os

import psycopg

OTP_AUDITS = []


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
    Inserisce le audit OTP di fixture se presenti, mantenendo l'operazione idempotente.

    Restituisce:
        None: Stampa a schermo l'esito dell'attività e termina senza valori.
    """
    if not OTP_AUDITS:
        print("No OTP audits to seed.")
        return
    with get_connection() as conn:
        with conn.cursor() as cur:
            for audit in OTP_AUDITS:
                cur.execute(
                    """
                    INSERT INTO otp_audits (id, user_id, otp_channel, status, attempted_at)
                    VALUES (%(id)s, %(user_id)s, %(otp_channel)s, %(status)s, %(attempted_at)s)
                    ON CONFLICT (id) DO NOTHING;
                    """,
                    audit,
                )
    print("Seeded otp_audits.")


if __name__ == "__main__":
    seed()
