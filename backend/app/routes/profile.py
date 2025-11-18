"""Endpoint per la gestione delle informazioni utente legate al profilo."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Response, status
from psycopg import AsyncConnection

from ..dependencies import AuthenticatedUser, get_authenticated_user
from ..db import get_connection
from ..schemas import PasswordChangeRequest, ProfileDeletionRequest, ProfileUpdateRequest
from ..services.keycloak_admin import (
    InvalidUserCredentialsError,
    KeycloakAdminError,
    PasswordUpdateFailed,
    get_keycloak_admin_client,
    KeycloakAdminClient,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profile", tags=["profile"])


@router.post(
    "/password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Aggiorna la password dell'utente su Keycloak",
    response_class=Response,
)
async def change_password(
    payload: PasswordChangeRequest,
    user: AuthenticatedUser = Depends(get_authenticated_user),
    keycloak_admin: KeycloakAdminClient = Depends(get_keycloak_admin_client),
) -> Response:
    """
    Aggiorna la password corrente dell'utente verificando prima le credenziali attuali.

    Solleva:
        HTTPException: 400 se la password corrente è errata o lo username non è disponibile.
                       502/503 per errori di comunicazione con Keycloak.
    """

    username = _resolve_username(user)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossibile determinare lo username dell'utente.",
        )

    try:
        await keycloak_admin.verify_user_credentials(username=username, password=payload.current_password)
    except InvalidUserCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La password corrente non è corretta.",
        ) from exc
    except KeycloakAdminError as exc:
        logger.exception("Errore verificando le credenziali su Keycloak")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Servizio di identità non disponibile (verifica credenziali).",
        ) from exc

    try:
        await keycloak_admin.set_user_password(user_id=user.subject, new_password=payload.new_password)
    except PasswordUpdateFailed as exc:
        logger.exception("Errore aggiornando la password su Keycloak")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Impossibile aggiornare la password in questo momento.",
        ) from exc
    except KeycloakAdminError as exc:
        logger.exception("Errore inatteso dal servizio di identità durante il cambio password")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Errore imprevisto dal servizio di identità.",
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _resolve_username(user: AuthenticatedUser) -> str | None:
    for claim_name in ("preferred_username", "username"):
        value = user.claims.get(claim_name)
        if isinstance(value, str) and value.strip():
            return value
    if user.email:
        return user.email
    return None


@router.put(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Aggiorna i dati anagrafici su Keycloak",
    response_class=Response,
)
async def update_profile(
    payload: ProfileUpdateRequest,
    user: AuthenticatedUser = Depends(get_authenticated_user),
    keycloak_admin: KeycloakAdminClient = Depends(get_keycloak_admin_client),
) -> Response:
    """Aggiorna parte del profilo utente utilizzando l'admin API di Keycloak."""
    try:
        await keycloak_admin.update_user_profile(
            user_id=user.subject,
            first_name=getattr(payload, "first_name", None),
            last_name=getattr(payload, "last_name", None),
            email=getattr(payload, "email", None),
        )
    except KeycloakAdminError as exc:
        logger.exception("Errore aggiornando il profilo utente su Keycloak")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Impossibile aggiornare il profilo in questo momento.",
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Elimina definitivamente il profilo utente",
    response_class=Response,
)
async def delete_profile(
    payload: ProfileDeletionRequest,
    user: AuthenticatedUser = Depends(get_authenticated_user),
    keycloak_admin: KeycloakAdminClient = Depends(get_keycloak_admin_client),
    conn: AsyncConnection = Depends(get_connection),
) -> Response:
    username = _resolve_username(user)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossibile determinare lo username dell'utente.",
        )

    try:
        await keycloak_admin.verify_user_credentials(username=username, password=payload.current_password)
    except InvalidUserCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La password corrente non è corretta.",
        ) from exc
    except KeycloakAdminError as exc:
        logger.exception("Errore verificando le credenziali su Keycloak (delete)")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Servizio di identità non disponibile (verifica credenziali).",
        ) from exc

    try:
        await keycloak_admin.delete_user(user_id=user.subject)
    except KeycloakAdminError as exc:
        logger.exception("Errore eliminando l'utente su Keycloak")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Impossibile eliminare il profilo in questo momento.",
        ) from exc

    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM users WHERE id = %s;", (user.user_id,))

    return Response(status_code=status.HTTP_204_NO_CONTENT)
