import type { AuthProviderProps } from 'react-oidc-context'
import type { OidcMetadata, User, UserManagerSettings } from 'oidc-client-ts'
import { appConfig } from '@/config/appConfig'

const { oidc, routes } = appConfig
const normalizeUrl = (value: string) => value.replace(/\/+$/, '')
const issuer = normalizeUrl(oidc.issuer)
const protocolBase = `${issuer}/protocol/openid-connect`
const registrationEndpoint = `${issuer}/clients-registrations/openid-connect`
const metadataDocument = {
  issuer,
  authorization_endpoint: `${protocolBase}/auth`,
  token_endpoint: `${protocolBase}/token`,
  userinfo_endpoint: `${protocolBase}/userinfo`,
  jwks_uri: `${protocolBase}/certs`,
  revocation_endpoint: `${protocolBase}/revoke`,
  introspection_endpoint: `${protocolBase}/token/introspect`,
  end_session_endpoint: `${protocolBase}/logout`,
  check_session_iframe: `${protocolBase}/login-status-iframe.html`,
  frontchannel_logout_supported: true,
  frontchannel_logout_session_supported: true,
  backchannel_logout_supported: true,
  backchannel_logout_session_supported: true,
  grant_types_supported: [
    'authorization_code',
    'implicit',
    'refresh_token',
    'password',
    'client_credentials',
    'urn:openid:params:grant-type:ciba',
    'urn:ietf:params:oauth:grant-type:device_code',
  ],
  acr_values_supported: ['0', '1'],
  response_types_supported: [
    'code',
    'none',
    'id_token',
    'token',
    'id_token token',
    'code id_token',
    'code token',
    'code id_token token',
  ],
  subject_types_supported: ['public', 'pairwise'],
  id_token_signing_alg_values_supported: [
    'PS384',
    'RS384',
    'EdDSA',
    'ES384',
    'HS256',
    'HS512',
    'ES256',
    'RS256',
    'HS384',
    'ES512',
    'PS256',
    'PS512',
    'RS512',
  ],
  id_token_encryption_alg_values_supported: ['RSA-OAEP', 'RSA-OAEP-256', 'RSA1_5'],
  id_token_encryption_enc_values_supported: [
    'A256GCM',
    'A192GCM',
    'A128GCM',
    'A128CBC-HS256',
    'A192CBC-HS384',
    'A256CBC-HS512',
  ],
  userinfo_signing_alg_values_supported: [
    'PS384',
    'RS384',
    'EdDSA',
    'ES384',
    'HS256',
    'HS512',
    'ES256',
    'RS256',
    'HS384',
    'ES512',
    'PS256',
    'PS512',
    'RS512',
    'none',
  ],
  userinfo_encryption_alg_values_supported: ['RSA-OAEP', 'RSA-OAEP-256', 'RSA1_5'],
  userinfo_encryption_enc_values_supported: [
    'A256GCM',
    'A192GCM',
    'A128GCM',
    'A128CBC-HS256',
    'A192CBC-HS384',
    'A256CBC-HS512',
  ],
  request_object_signing_alg_values_supported: [
    'PS384',
    'RS384',
    'EdDSA',
    'ES384',
    'HS256',
    'HS512',
    'ES256',
    'RS256',
    'HS384',
    'ES512',
    'PS256',
    'PS512',
    'RS512',
    'none',
  ],
  request_object_encryption_alg_values_supported: ['RSA-OAEP', 'RSA-OAEP-256', 'RSA1_5'],
  request_object_encryption_enc_values_supported: [
    'A256GCM',
    'A192GCM',
    'A128GCM',
    'A128CBC-HS256',
    'A192CBC-HS384',
    'A256CBC-HS512',
  ],
  response_modes_supported: [
    'query',
    'fragment',
    'form_post',
    'query.jwt',
    'fragment.jwt',
    'form_post.jwt',
    'jwt',
  ],
  registration_endpoint: registrationEndpoint,
  token_endpoint_auth_methods_supported: [
    'private_key_jwt',
    'client_secret_basic',
    'client_secret_post',
    'tls_client_auth',
    'client_secret_jwt',
  ],
  token_endpoint_auth_signing_alg_values_supported: [
    'PS384',
    'RS384',
    'EdDSA',
    'ES384',
    'HS256',
    'HS512',
    'ES256',
    'RS256',
    'HS384',
    'ES512',
    'PS256',
    'PS512',
    'RS512',
  ],
  introspection_endpoint_auth_methods_supported: [
    'private_key_jwt',
    'client_secret_basic',
    'client_secret_post',
    'tls_client_auth',
    'client_secret_jwt',
  ],
  introspection_endpoint_auth_signing_alg_values_supported: [
    'PS384',
    'RS384',
    'EdDSA',
    'ES384',
    'HS256',
    'HS512',
    'ES256',
    'RS256',
    'HS384',
    'ES512',
    'PS256',
    'PS512',
    'RS512',
  ],
  authorization_signing_alg_values_supported: [
    'PS384',
    'RS384',
    'EdDSA',
    'ES384',
    'HS256',
    'HS512',
    'ES256',
    'RS256',
    'HS384',
    'ES512',
    'PS256',
    'PS512',
    'RS512',
  ],
  authorization_encryption_alg_values_supported: ['RSA-OAEP', 'RSA-OAEP-256', 'RSA1_5'],
  authorization_encryption_enc_values_supported: [
    'A256GCM',
    'A192GCM',
    'A128GCM',
    'A128CBC-HS256',
    'A192CBC-HS384',
    'A256CBC-HS512',
  ],
  claims_supported: [
    'aud',
    'sub',
    'iss',
    'auth_time',
    'name',
    'given_name',
    'family_name',
    'preferred_username',
    'email',
    'acr',
  ],
  claim_types_supported: ['normal'],
  claims_parameter_supported: true,
  scopes_supported: ['openid', 'profile', 'thesis-access', 'offline_access', 'email'],
  request_parameter_supported: true,
  request_uri_parameter_supported: true,
  require_request_uri_registration: true,
  code_challenge_methods_supported: ['plain', 'S256'],
  tls_client_certificate_bound_access_tokens: true,
  revocation_endpoint_auth_methods_supported: [
    'private_key_jwt',
    'client_secret_basic',
    'client_secret_post',
    'tls_client_auth',
    'client_secret_jwt',
  ],
  revocation_endpoint_auth_signing_alg_values_supported: [
    'PS384',
    'RS384',
    'EdDSA',
    'ES384',
    'HS256',
    'HS512',
    'ES256',
    'RS256',
    'HS384',
    'ES512',
    'PS256',
    'PS512',
    'RS512',
  ],
  backchannel_token_delivery_modes_supported: ['poll', 'ping'],
  backchannel_authentication_endpoint: `${protocolBase}/ext/ciba/auth`,
  backchannel_authentication_request_signing_alg_values_supported: [
    'PS384',
    'RS384',
    'EdDSA',
    'ES384',
    'ES256',
    'RS256',
    'ES512',
    'PS256',
    'PS512',
    'RS512',
  ],
  require_pushed_authorization_requests: false,
  pushed_authorization_request_endpoint: `${protocolBase}/ext/par/request`,
  mtls_endpoint_aliases: {
    token_endpoint: `${protocolBase}/token`,
    revocation_endpoint: `${protocolBase}/revoke`,
    introspection_endpoint: `${protocolBase}/token/introspect`,
    registration_endpoint: registrationEndpoint,
    userinfo_endpoint: `${protocolBase}/userinfo`,
    pushed_authorization_request_endpoint: `${protocolBase}/ext/par/request`,
    backchannel_authentication_endpoint: `${protocolBase}/ext/ciba/auth`,
  },
  authorization_response_iss_parameter_supported: true,
} as const
const staticMetadata = metadataDocument as unknown as Partial<OidcMetadata>

const normalizeTargetOrigin = (url: string) => {
  try {
    const parsed = new URL(url)
    return { origin: parsed.origin, pathname: parsed.pathname || '/' }
  } catch {
    return { origin: issuer, pathname: '/' }
  }
}

const logoutTarget = normalizeTargetOrigin(oidc.postLogoutRedirectUri)

const isOnLogoutCallback = () => {
  if (typeof window === 'undefined') {
    return false
  }
  const { origin, pathname } = window.location
  return origin === logoutTarget.origin && pathname === logoutTarget.pathname
}

const applyPostLogoutRedirect = () => {
  if (typeof window === 'undefined') {
    return
  }
  window.history.replaceState({}, document.title, logoutTarget.pathname)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const baseSettings: UserManagerSettings = {
  authority: issuer,
  client_id: oidc.clientId,
  redirect_uri: oidc.redirectUri,
  silent_redirect_uri: oidc.silentRedirectUri,
  post_logout_redirect_uri: oidc.postLogoutRedirectUri,
  response_type: 'code',
  scope: oidc.scope,
  automaticSilentRenew: true,
  loadUserInfo: true,
  revokeTokensOnSignout: true,
  monitorSession: true,
  filterProtocolClaims: true,
  metadata: staticMetadata,
}

const resolveRedirectPath = (user: User | undefined) => {
  const fallback = routes.home
  if (typeof window === 'undefined') {
    return fallback
  }

  const state = user?.state as { redirectTo?: string } | undefined
  const candidate = state?.redirectTo
  if (!candidate || typeof candidate !== 'string') {
    return fallback
  }

  try {
    const base = window.location.origin
    const resolved = new URL(candidate, base)
    if (resolved.origin !== base) {
      return fallback
    }
    const normalizedPath = `${resolved.pathname}${resolved.search}${resolved.hash}` || fallback
    if (
      normalizedPath === routes.authCallback ||
      normalizedPath === routes.silentRefresh ||
      normalizedPath.startsWith('/auth/')
    ) {
      return fallback
    }
    return normalizedPath
  } catch {
    return fallback
  }
}

export const oidcConfig: AuthProviderProps = {
  ...baseSettings,
  onSigninCallback: async (user) => {
    const target = resolveRedirectPath(user)
    window.history.replaceState({}, document.title, target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  },
  matchSignoutCallback: () => isOnLogoutCallback(),
  onSignoutCallback: async () => {
    applyPostLogoutRedirect()
  },
}
