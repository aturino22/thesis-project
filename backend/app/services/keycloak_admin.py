"""Client leggero per interagire con le API amministrative di Keycloak."""

from __future__ import annotations

from typing import Any

import httpx
from fastapi import Depends, HTTPException, status

from ..config import Settings, get_settings


class KeycloakAdminError(RuntimeError):
    """Errore generico prodotto durante l'interazione con Keycloak."""


class InvalidUserCredentialsError(KeycloakAdminError):
    """Segnala che le credenziali fornite dall'utente non sono valide."""


class PasswordUpdateFailed(KeycloakAdminError):
    """Segnala un errore nel tentativo di aggiornare la password dell'utente."""


class KeycloakAdminClient:
    """Wrapper minimale per le operazioni amministrative richieste dal profilo utente."""

    def __init__(self, settings: Settings, *, timeout: float = 10.0) -> None:
        client_id = settings.keycloak_admin_client_id or settings.keycloak_public_client_id
        if not client_id:
            msg = "Configurazione Keycloak admin incompleta."
            raise KeycloakAdminError(msg)

        self._realm = settings.keycloak_realm
        base = settings.keycloak_base_url.rstrip("/")
        self._token_endpoint = f"{base}/realms/{self._realm}/protocol/openid-connect/token"
        self._admin_base_url = f"{base}/admin/realms/{self._realm}"
        self._client_id = client_id
        self._client_secret = settings.keycloak_admin_client_secret
        self._admin_username = settings.keycloak_admin_username
        self._admin_password = settings.keycloak_admin_password
        self._admin_token_client_id = settings.keycloak_admin_token_client_id or "admin-cli"
        admin_realm = settings.keycloak_admin_token_realm
        if not admin_realm:
            admin_realm = "master" if self._admin_username else self._realm
        self._admin_token_endpoint = f"{base}/realms/{admin_realm}/protocol/openid-connect/token"
        self._timeout = timeout

    async def verify_user_credentials(self, *, username: str, password: str) -> None:
        """
        Verifica che le credenziali correnti fornite dall'utente siano valide.

        Solleva:
            InvalidUserCredentialsError: se lo username/password non sono riconosciuti.
            KeycloakAdminError: per errori di rete o risposte inattese.
        """
        data = {
            "grant_type": "password",
            "client_id": self._client_id,
            "username": username,
            "password": password,
        }
        if self._client_secret:
            data["client_secret"] = self._client_secret
        response = await self._post_form(self._token_endpoint, data)
        if response.status_code == status.HTTP_200_OK:
            return
        if response.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED):
            raise InvalidUserCredentialsError("Credenziali non valide.")
        raise KeycloakAdminError(f"Errore inatteso dal token endpoint: {response.text}")

    async def set_user_password(self, *, user_id: str, new_password: str) -> None:
        """
        Aggiorna la password dell'utente tramite le API amministrative.

        Solleva:
            PasswordUpdateFailed: se Keycloak rifiuta l'aggiornamento.
            KeycloakAdminError: per errori di rete o acquisizione token.
        """
        admin_token = await self._obtain_admin_token()
        url = f"{self._admin_base_url}/users/{user_id}/reset-password"
        payload = {"type": "password", "value": new_password, "temporary": False}
        headers = {"Authorization": f"Bearer {admin_token}"}

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.put(url, headers=headers, json=payload)
        except httpx.RequestError as exc:  # pragma: no cover - rete non disponibile
            raise PasswordUpdateFailed("Errore di rete durante l'aggiornamento password.") from exc

        if response.status_code not in (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK):
            raise PasswordUpdateFailed(f"Keycloak ha rifiutato la modifica: {response.text}")

    async def update_user_profile(self, *, user_id: str, first_name: str | None, last_name: str | None, email: str | None) -> None:
        """
        Aggiorna i campi del profilo Keycloak per l'utente selezionato.
        """
        admin_token = await self._obtain_admin_token()
        url = f"{self._admin_base_url}/users/{user_id}"
        data: dict[str, Any] = {}
        if first_name is not None:
            data["firstName"] = first_name
        if last_name is not None:
            data["lastName"] = last_name
        if email is not None:
            data["email"] = email
        if not data:
            return
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.put(url, headers=headers, json=data)
        except httpx.RequestError as exc:  # pragma: no cover
            raise KeycloakAdminError("Errore di rete durante l'aggiornamento del profilo.") from exc
        if response.status_code not in (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK):
            raise KeycloakAdminError(f"Keycloak ha rifiutato l'aggiornamento profilo: {response.text}")

    async def delete_user(self, *, user_id: str) -> None:
        """
        Elimina definitivamente un utente dal realm configurato.
        """
        admin_token = await self._obtain_admin_token()
        url = f"{self._admin_base_url}/users/{user_id}"
        headers = {"Authorization": f"Bearer {admin_token}"}

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.delete(url, headers=headers)
        except httpx.RequestError as exc:  # pragma: no cover
            raise KeycloakAdminError("Errore di rete durante l'eliminazione dell'utente.") from exc

        if response.status_code not in (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK):
            raise KeycloakAdminError(f"Keycloak ha rifiutato l'eliminazione: {response.text}")

    async def _obtain_admin_token(self) -> str:
        if self._admin_username and self._admin_password:
            data = {
                "grant_type": "password",
                "client_id": self._admin_token_client_id,
                "username": self._admin_username,
                "password": self._admin_password,
            }
            if self._admin_token_client_id == self._client_id and self._client_secret:
                data["client_secret"] = self._client_secret
            token_endpoint = self._admin_token_endpoint
        else:
            if not self._client_secret:
                raise KeycloakAdminError("Client secret mancante per l'autenticazione amministrativa.")
            data = {
                "grant_type": "client_credentials",
                "client_id": self._client_id,
                "client_secret": self._client_secret,
            }
            token_endpoint = self._token_endpoint
        response = await self._post_form(token_endpoint, data)
        if response.status_code != status.HTTP_200_OK:
            raise KeycloakAdminError(f"Impossibile ottenere il token amministrativo: {response.text}")
        token_data = response.json()
        access_token = token_data.get("access_token")
        if not isinstance(access_token, str):
            raise KeycloakAdminError("Risposta del token endpoint priva di access_token.")
        return access_token

    async def _post_form(self, url: str, data: dict[str, Any]) -> httpx.Response:
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                return await client.post(url, data=data)
        except httpx.RequestError as exc:  # pragma: no cover - rete non disponibile
            raise KeycloakAdminError("Errore di rete durante la comunicazione con Keycloak.") from exc


async def get_keycloak_admin_client(settings: Settings = Depends(get_settings)) -> KeycloakAdminClient:
    """
    Dipendenza FastAPI che costruisce il client amministrativo Keycloak.

    Solleva:
        HTTPException 503: se la configurazione necessaria non è presente.
    """
    try:
        return KeycloakAdminClient(settings)
    except KeycloakAdminError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Configurazione Keycloak amministrativa non disponibile.",
        ) from exc
