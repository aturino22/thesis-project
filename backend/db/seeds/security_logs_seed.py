from __future__ import annotations

import os

import psycopg

SECURITY_LOGS = []


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
    Inserisce i log di sicurezza di fixture se presenti, mantenendo l'operazione idempotente.

    Restituisce:
        None: Stampa a schermo l'esito dell'attività e termina senza valori.
    """
    if not SECURITY_LOGS:
        print("No security logs to seed.")
        return
    with get_connection() as conn:
        with conn.cursor() as cur:
            for log in SECURITY_LOGS:
                cur.execute(
                    """
                    INSERT INTO security_logs (id, user_id, event_type, metadata, logged_at)
                    VALUES (%(id)s, %(user_id)s, %(event_type)s, %(metadata)s, %(logged_at)s)
                    ON CONFLICT (id) DO NOTHING;
                    """,
                    log,
                )
    print("Seeded security_logs.")


if __name__ == "__main__":
    seed()
