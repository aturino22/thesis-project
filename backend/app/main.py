"""Punto di ingresso dell'applicazione FastAPI."""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .db import lifespan_pool
from .routes import accounts_router, crypto_positions_router, market_router, otp_router, transactions_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    Gestisce le operazioni di startup e shutdown dell'applicazione.

    Argomenti:
        app: Istanza FastAPI su cui montare lo stato condiviso.

    Restituisce:
        AsyncIterator[None]: Contesto asincrono che mantiene vivo il pool database.
    """
    settings = get_settings()
    app.state.settings = settings
    async with lifespan_pool(settings) as pool:
        app.state.db_pool = pool
        yield


def create_app() -> FastAPI:
    """
    Crea e configura l'istanza FastAPI principale.

    Restituisce:
        FastAPI: Applicazione pronta con impostazioni e API montate.
    """
    settings: Settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        debug=settings.debug,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins_list(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["health"])
    async def healthcheck() -> dict[str, str]:
        """
        Verifica lo stato di salute dell'applicazione.

        Restituisce:
            dict[str, str]: Esito dell'healthcheck con ambiente correntemente attivo.
        """
        return {
            "status": "ok",
            "environment": settings.environment,
        }

    app.include_router(accounts_router)
    app.include_router(crypto_positions_router)
    app.include_router(market_router)
    app.include_router(transactions_router)
    app.include_router(otp_router)

    return app


app = create_app()
