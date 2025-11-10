from __future__ import annotations

import os

import psycopg

TRANSACTIONS = []


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
    Inserisce le transazioni di fixture se presenti, mantenendo l'operazione idempotente.

    Restituisce:
        None: Stampa a schermo l'esito dell'attività e termina senza valori.
    """
    if not TRANSACTIONS:
        print("No transactions to seed.")
        return
    with get_connection() as conn:
        with conn.cursor() as cur:
            for tx in TRANSACTIONS:
                cur.execute(
                    """
                    INSERT INTO transactions (id, user_id, account_id, amount, currency, category, idem_key, direction, created_at)
                    VALUES (%(id)s, %(user_id)s, %(account_id)s, %(amount)s, %(currency)s, %(category)s, %(idem_key)s, %(direction)s, %(created_at)s)
                    ON CONFLICT (id) DO NOTHING;
                    """,
                    tx,
                )
    print("Seeded transactions.")


if __name__ == "__main__":
    seed()
