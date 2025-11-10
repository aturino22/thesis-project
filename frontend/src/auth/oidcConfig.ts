import type { AuthProviderProps } from 'react-oidc-context'
import type { User, UserManagerSettings } from 'oidc-client-ts'
import { appConfig } from '@/config/appConfig'

const { oidc, routes } = appConfig

const baseSettings: UserManagerSettings = {
  authority: oidc.issuer,
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
}
