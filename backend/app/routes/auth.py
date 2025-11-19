"""Endpoint per autenticazione e gestione token."""

from typing import Annotated

from fastapi import APIRouter, Form, HTTPException, status
import httpx

from ..config import get_settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/token",
    summary="Ottieni access token",
    description="""
    Ottiene un access token da Keycloak usando le credenziali utente.
    
    **Nota**: Questo endpoint è fornito per comodità di testing.
    In produzione, il frontend dovrebbe usare il flusso OIDC/PKCE diretto con Keycloak.
    
    **Credenziali Demo**:
    - Username: `demo-user`
    - Password: `DemoPassword!123`
    """,
    response_description="Token JWT e informazioni di sessione",
)
async def get_token(
    username: Annotated[str, Form(description="Username utente")],
    password: Annotated[str, Form(description="Password utente")],
    grant_type: Annotated[str, Form()] = "password",
    client_id: Annotated[str, Form()] = "frontend",
    scope: Annotated[str, Form()] = "openid profile email thesis-access",
) -> dict:
    """
    Proxy endpoint per ottenere token da Keycloak.
    
    Questo endpoint facilita il testing delle API tramite Swagger UI,
    permettendo di ottenere un token senza configurare manualmente il flusso OIDC.
    
    Args:
        username: Username dell'utente
        password: Password dell'utente
        grant_type: Tipo di grant OAuth2 (default: password)
        client_id: Client ID Keycloak (default: frontend)
        scope: Scope richiesti (default: openid profile email thesis-access)
    
    Returns:
        dict: Risposta Keycloak con access_token, refresh_token, expires_in, ecc.
    
    Raises:
        HTTPException: Se le credenziali sono invalide o Keycloak non è raggiungibile
    """
    settings = get_settings()
    
    # URL token endpoint Keycloak
    token_url = f"{settings.keycloak_base_url}/realms/{settings.keycloak_realm}/protocol/openid-connect/token"
    
    # Prepara dati per richiesta
    data = {
        "grant_type": grant_type,
        "client_id": client_id,
        "username": username,
        "password": password,
        "scope": scope,
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10.0,
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Credenziali non valide. Verifica username e password.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Errore comunicazione con Keycloak: {response.status_code}",
                )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Keycloak non raggiungibile: {str(exc)}",
        ) from exc


@router.post(
    "/refresh",
    summary="Refresh access token",
    description="Ottiene un nuovo access token usando il refresh token.",
)
async def refresh_token(
    refresh_token: Annotated[str, Form(description="Refresh token ottenuto dal login")],
    grant_type: Annotated[str, Form()] = "refresh_token",
    client_id: Annotated[str, Form()] = "frontend",
) -> dict:
    """
    Rinnova l'access token usando il refresh token.
    
    Args:
        refresh_token: Refresh token ottenuto dal login
        grant_type: Tipo di grant (default: refresh_token)
        client_id: Client ID Keycloak (default: frontend)
    
    Returns:
        dict: Nuovo access_token e refresh_token
    
    Raises:
        HTTPException: Se il refresh token è invalido o scaduto
    """
    settings = get_settings()
    
    token_url = f"{settings.keycloak_base_url}/realms/{settings.keycloak_realm}/protocol/openid-connect/token"
    
    data = {
        "grant_type": grant_type,
        "client_id": client_id,
        "refresh_token": refresh_token,
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10.0,
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 400:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Refresh token non valido o scaduto.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Errore comunicazione con Keycloak: {response.status_code}",
                )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Keycloak non raggiungibile: {str(exc)}",
        ) from exc
