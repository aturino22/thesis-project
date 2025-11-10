"""Utility per l'integrazione del database con l'applicazione FastAPI."""

from __future__ import annotations

import asyncio
import sys
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import Depends, Request
from psycopg import AsyncConnection
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from backend.app.dependencies import AuthenticatedUser, get_authenticated_user

from .config import Settings


def _ensure_asyncio_policy() -> None:
    """
    Garantisce il corretto funzionamento di psycopg asincrono su Windows forzando
    l'utilizzo della policy `WindowsSelectorEventLoopPolicy`.

    Restituisce:
        None: La policy del loop viene aggiornata in-place se necessario.
    """
    if sys.platform.startswith("win"):
        try:
            from asyncio import WindowsSelectorEventLoopPolicy
        except ImportError:  # pragma: no cover - not available on non-Windows
            return

        policy = asyncio.get_event_loop_policy()
        if not isinstance(policy, WindowsSelectorEventLoopPolicy):
            asyncio.set_event_loop_policy(WindowsSelectorEventLoopPolicy())


_ensure_asyncio_policy()


async def _configure_connection(conn: AsyncConnection) -> None:
    """
    Configura ogni connessione ottenuta dal pool con le impostazioni standard.

    Argomenti:
        conn: Connessione asincrona da configurare con la row factory desiderata.

    Restituisce:
        None: La connessione viene aggiornata in-place senza valore di ritorno.
    """
    conn.row_factory = dict_row


async def set_current_user_id(conn: AsyncConnection, user_id: str) -> None:
    """
    Imposta la variabile di sessione utilizzata dalle policy RLS per isolare i dati.

    Argomenti:
        conn: Connessione asincrona sulla quale applicare la configurazione.
        user_id: Identificativo dell'utente corrente estratto dal contesto applicativo.

    Restituisce:
        None: Aggiorna lo stato della connessione senza restituire valori.
    """
    await conn.execute(
        "SELECT set_config('app.current_user_id', %s, true);",
        (user_id,),
    )


def create_pool(settings: Settings) -> AsyncConnectionPool:
    """
    Inizializza il pool di connessioni asincrone utilizzando le impostazioni applicative.

    Argomenti:
        settings: Oggetto di configurazione che contiene DSN e limiti del pool.

    Restituisce:
        AsyncConnectionPool: Pool configurato, pronto per essere aperto esplicitamente.
    """
    return AsyncConnectionPool(
        conninfo=settings.database_conninfo(),
        configure=_configure_connection,
        open=False,
        **settings.pool_kwargs(),
    )


async def close_pool(pool: AsyncConnectionPool) -> None:
    """
    Chiude in modo pulito il pool di connessioni rilasciando tutte le risorse.

    Argomenti:
        pool: Pool di connessioni attivo da chiudere.

    Restituisce:
        None: L'operazione avviene in-place senza valore di ritorno.
    """
    await pool.close()


@asynccontextmanager
async def lifespan_pool(settings: Settings) -> AsyncIterator[AsyncConnectionPool]:
    """
    Gestisce il ciclo di vita del pool durante gli hook `lifespan` di FastAPI.

    Argomenti:
        settings: Impostazioni applicative utilizzate per configurare il pool.

    Restituisce:
        AsyncConnectionPool: Pool aperto e pronto all'uso finché il contesto rimane attivo.
    """
    pool = create_pool(settings)
    await pool.open()
    await pool.wait()
    try:
        yield pool
    finally:
        await close_pool(pool)



async def get_connection_with_rls(
    request: Request,
    user: AuthenticatedUser = Depends(get_authenticated_user),
) -> AsyncIterator[AsyncConnection]:
    """
    Fornisce una connessione proveniente dal pool come dipendenza FastAPI.

    Argomenti:
        request: Oggetto `Request` che consente l'accesso allo stato dell'applicazione.
        user: Informazioni sull'utente autenticato da cui ricavare l'identificativo.

    Restituisce:
        AsyncConnection: Connessione asincrona condivisa dal pool per la durata del contesto.
    """
    pool: AsyncConnectionPool = request.app.state.db_pool
    async with pool.connection() as connection:
        await set_current_user_id(connection, user.user_id)
        yield connection
