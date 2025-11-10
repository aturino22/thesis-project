"""Helper per la validazione dei token OIDC emessi da Keycloak o IdP compatibile."""

from __future__ import annotations

import json
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse
from urllib.request import urlopen

import jwt
from jwt import PyJWTError
from jwt.algorithms import RSAAlgorithm


class OIDCConfigurationError(RuntimeError):
    """Errore sollevato quando la configurazione OIDC risulta incompleta o invalida."""


class TokenVerificationError(RuntimeError):
    """Errore generico legato alla verifica del token di accesso."""


@dataclass(frozen=True)
class DecodedAccessToken:
    """Rappresenta il risultato della validazione del token OIDC."""

    claims: dict[str, Any]


def _load_jwks_from_source(source: str) -> dict[str, Any]:
    """
    Recupera la JWKS dal percorso o URL configurato.

    Argomenti:
        source: Percorso locale o URL (http/https) da cui recuperare il documento JWKS.

    Restituisce:
        dict[str, Any]: Dizionario compatibile con il formato JSON Web Key Set.
    """
    parsed = urlparse(source)
    if parsed.scheme in {"http", "https"}:
        with urlopen(source) as response:  # nosec: B310 - sorgente controllata via configurazione
            payload = response.read()
    else:
        path = Path(source)
        payload = path.read_bytes()
    jwks = json.loads(payload.decode("utf-8"))
    if "keys" not in jwks:
        raise OIDCConfigurationError("La JWKS recuperata non contiene alcuna chiave valida.")
    return jwks


class KeycloakTokenVerifier:
    """Gestisce il download e la validazione delle chiavi pubbliche usate per verificare i token."""

    def __init__(
        self,
        issuer: str | None,
        audience: str | None,
        jwks_url: str,
        *,
        cache_ttl_seconds: int = 300,
        clock_skew_seconds: int = 60,
        allowed_algorithms: Iterable[str] | None = None,
    ) -> None:
        if not jwks_url:
            raise OIDCConfigurationError("L'URL JWKS non può essere vuoto.")
        if issuer is None:
            raise OIDCConfigurationError("È necessario configurare l'issuer OIDC per validare i token.")
        self._issuer = issuer
        self._audience = audience
        self._jwks_url = jwks_url
        self._cache_ttl_seconds = cache_ttl_seconds
        self._clock_skew_seconds = clock_skew_seconds
        self._allowed_algorithms = tuple(allowed_algorithms or ("RS256",))
        self._cached_jwks: dict[str, Any] | None = None
        self._jwks_expires_at: float = 0.0
        self._lock = threading.RLock()

    def _get_jwks(self) -> dict[str, Any]:
        """Recupera (o ricarica) la JWKS rispettando un semplice caching in memoria."""
        with self._lock:
            now = time.time()
            if self._cached_jwks is None or now >= self._jwks_expires_at:
                self._cached_jwks = _load_jwks_from_source(self._jwks_url)
                self._jwks_expires_at = now + max(self._cache_ttl_seconds, 30)
            return self._cached_jwks

    def _select_key(self, token: str) -> str:
        """Individua la chiave pubblica da usare per verificare la firma del JWT."""
        try:
            header = jwt.get_unverified_header(token)
        except PyJWTError as exc:
            raise TokenVerificationError("Impossibile leggere l'header del token.") from exc

        kid = header.get("kid")
        if kid is None:
            raise TokenVerificationError("Il token non specifica alcun 'kid'.")

        jwks = self._get_jwks()
        try:
            key_dict = next(key for key in jwks["keys"] if key.get("kid") == kid)
        except StopIteration as exc:
            raise TokenVerificationError("Nessuna chiave compatibile trovata nella JWKS.") from exc

        return RSAAlgorithm.from_jwk(json.dumps(key_dict))

    def verify(self, token: str) -> DecodedAccessToken:
        """
        Valida la firma e le principali claim del token.

        Argomenti:
            token: Access token OIDC inviato dal client.

        Restituisce:
            DecodedAccessToken: Risultato della decodifica contenente le claim.
        """
        if not token:
            raise TokenVerificationError("Token di accesso mancante.")

        signing_key = self._select_key(token)
        options: dict[str, Any] = {"verify_aud": bool(self._audience)}
        kwargs: dict[str, Any] = {}
        if self._audience:
            kwargs["audience"] = self._audience

        try:
            claims = jwt.decode(
                token,
                signing_key,
                algorithms=self._allowed_algorithms,
                issuer=self._issuer,
                leeway=self._clock_skew_seconds,
                options=options,
                **kwargs,
            )
        except PyJWTError as exc:
            raise TokenVerificationError("Token non valido o scaduto.") from exc

        return DecodedAccessToken(claims=claims)
