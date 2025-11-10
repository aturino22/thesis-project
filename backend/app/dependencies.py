"""Dipendenze condivise fra i vari endpoint FastAPI."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Iterable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import Settings, get_settings
from .oidc import DecodedAccessToken, KeycloakTokenVerifier, OIDCConfigurationError, TokenVerificationError

DEFAULT_USER_ID = "aaaaaaaa-1111-2222-3333-444444444444"
_bearer_scheme = HTTPBearer(auto_error=False)
_DEFAULT_TOKEN_ALGORITHMS: tuple[str, ...] = ("RS256",)


@dataclass(frozen=True)
class AuthenticatedUser:
    """Contesto minimale dell'utente autenticato ricavato dal token di accesso."""

    user_id: str
    subject: str
    scopes: set[str]
    claims: dict[str, Any]
    email: str | None = None


@lru_cache(maxsize=1)
def _token_verifier_from_settings(
    issuer: str,
    audience: str | None,
    jwks_url: str,
    cache_ttl_seconds: int,
    clock_skew_seconds: int,
    algorithms: Iterable[str],
) -> KeycloakTokenVerifier:
    """Istanzia e memoizza il verificatore di token basandosi sulla configurazione corrente."""
    return KeycloakTokenVerifier(
        issuer=issuer,
        audience=audience,
        jwks_url=jwks_url,
        cache_ttl_seconds=cache_ttl_seconds,
        clock_skew_seconds=clock_skew_seconds,
        allowed_algorithms=algorithms,
    )


def _decode_access_token(settings: Settings, token: str) -> DecodedAccessToken:
    """Decodifica il token sfruttando le impostazioni applicative OIDC."""
    if not settings.oidc_issuer or not settings.oidc_jwks_url:
        raise OIDCConfigurationError("Configurazione OIDC mancante o incompleta.")
    verifier = _token_verifier_from_settings(
        issuer=settings.oidc_issuer,
        audience=settings.oidc_audience,
        jwks_url=settings.oidc_jwks_url,
        cache_ttl_seconds=settings.oidc_jwks_cache_ttl_seconds,
        clock_skew_seconds=settings.oidc_clock_skew_seconds,
        algorithms=_DEFAULT_TOKEN_ALGORITHMS,
    )
    return verifier.verify(token)


def _build_default_user(settings: Settings) -> AuthenticatedUser:
    """Crea un utente fittizio da utilizzare negli ambienti di sviluppo senza OIDC."""
    scopes = settings.oidc_default_scope_set()
    return AuthenticatedUser(
        user_id=DEFAULT_USER_ID,
        subject=DEFAULT_USER_ID,
        scopes=scopes,
        claims={"sub": DEFAULT_USER_ID, "scope": " ".join(sorted(scopes))},
    )


async def get_authenticated_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    """
    Risolve l'utente autenticato a partire dal bearer token oppure da un profilo di default.

    Restituisce:
        AuthenticatedUser: Informazioni minimali (id, scope, claim) da riutilizzare a valle.
    """
    cached_user = getattr(request.state, "authenticated_user", None)
    if cached_user is not None:
        return cached_user

    if not settings.oidc_is_configured():
        user = _build_default_user(settings)
        request.state.authenticated_user = user
        return user

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token di accesso mancante.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        decoded = _decode_access_token(settings, credentials.credentials)
    except (TokenVerificationError, OIDCConfigurationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token non valido o scaduto.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    claims = decoded.claims
    user_id_claim = settings.oidc_user_id_claim or "sub"
    user_id = claims.get(user_id_claim) or claims.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Claim '{user_id_claim}' assente dal token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scope_claim = claims.get("scope", "")
    if isinstance(scope_claim, str):
        scopes = {scope for scope in scope_claim.split() if scope}
    elif isinstance(scope_claim, (set, list, tuple)):
        scopes = {str(scope) for scope in scope_claim}
    else:
        scopes = set()

    realm_access = claims.get("realm_access", {}) or {}
    scopes.update(str(role) for role in realm_access.get("roles", []) if role)

    resource_access = claims.get("resource_access", {}) or {}
    for access in resource_access.values():
        scopes.update(str(role) for role in (access or {}).get("roles", []) if role)

    if "thesis-access" in scopes:
        scopes.update(settings.oidc_default_scope_set())

    user = AuthenticatedUser(
        user_id=str(user_id),
        subject=str(claims.get("sub", user_id)),
        scopes=scopes,
        claims={key: value for key, value in claims.items()},
        email=claims.get("email"),
    )
    request.state.authenticated_user = user
    return user


def require_scope(required_scope: str):
    """
    Factory che produce una dipendenza FastAPI per controllare la presenza di uno scope.

    Argomenti:
        required_scope: Scope da richiedere nel token (es. `transactions:read`).

    Restituisce:
        Callable: Dipendenza riutilizzabile con `Depends`.
    """

    async def _require_scope(user: AuthenticatedUser = Depends(get_authenticated_user)) -> AuthenticatedUser:
        if required_scope not in user.scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Scope '{required_scope}' assente o insufficiente.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    return _require_scope
