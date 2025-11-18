"""Utilità per verificare la Strong Customer Authentication lato backend."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from psycopg import AsyncConnection

from .db import get_connection_with_rls
from .dependencies import AuthenticatedUser, get_authenticated_user


def require_recent_mfa(max_age_seconds: int = 300, context: str = "default"):
    """
    Restituisce una dipendenza FastAPI che garantisce la presenza di una verifica MFA recente.

    Args:
        max_age_seconds: Intervallo massimo ammesso tra la verifica MFA e l'operazione richiesta.
        context: Contesto logico della verifica (es. default, payout).
    """

    async def _dependency(
        conn: AsyncConnection = Depends(get_connection_with_rls),
        user: AuthenticatedUser = Depends(get_authenticated_user),
    ) -> AuthenticatedUser:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT verified_at, expires_at
                FROM user_mfa_sessions
                WHERE user_id = %s AND context = %s;
                """,
                (user.user_id, context),
            )
            row = await cur.fetchone()

        now = datetime.now(timezone.utc)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Verifica MFA richiesta per completare l'operazione.",
            )
        record = dict(row)
        verified_at = record["verified_at"]
        expires_at = record["expires_at"]

        if expires_at < now or (now - verified_at).total_seconds() > max_age_seconds:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La verifica MFA è scaduta. Ripeti la procedura di conferma.",
            )
        return user

    return _dependency
