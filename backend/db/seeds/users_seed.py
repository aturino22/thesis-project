from __future__ import annotations

import os
from datetime import date, datetime

import psycopg


USERS = [
    {
        "id": "aaaaaaaa-1111-2222-3333-444444444444",
        "email": "turino.alessandro2201@gmail.com",
        "nome": "Alessandro",
        "cognome": "Turino",
        "birthday": date(1996, 1, 22),
        "preferred_otp_channel": "22222222-2222-2222-2222-222222222222",
    }
]


def get_connection() -> psycopg.Connection:
    """
    Crea una connessione al database applicando eventuali override da variabili d'ambiente.

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
    Inserisce o aggiorna gli utenti di fixture mantenendo l'operazione idempotente.

    Restituisce:
        None: Stampa a schermo l'esito dell'attività senza valori aggiuntivi.
    """
    now = datetime.utcnow()
    with get_connection() as conn:
        with conn.cursor() as cur:
            for user in USERS:
                cur.execute(
                    """
                    INSERT INTO users (id, email, nome, cognome, birthday, preferred_otp_channel, created_at)
                    VALUES (%(id)s, %(email)s, %(nome)s, %(cognome)s, %(birthday)s, %(preferred_otp_channel)s, %(created_at)s)
                    ON CONFLICT (id) DO UPDATE
                        SET email = EXCLUDED.email,
                            nome = EXCLUDED.nome,
                            cognome = EXCLUDED.cognome,
                            birthday = EXCLUDED.birthday,
                            preferred_otp_channel = EXCLUDED.preferred_otp_channel;
                    """,
                    {
                        **user,
                        "created_at": now,
                    },
                )
    print("Seeded users.")


if __name__ == "__main__":
    seed()
