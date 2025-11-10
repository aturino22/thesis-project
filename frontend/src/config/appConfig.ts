type EnvValue = string | undefined

const appOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'

const getEnv = (value: EnvValue, fallback: string) =>
  value && value.length > 0 ? value : fallback

const getPathname = (url: EnvValue, fallback: string) => {
  if (!url) return fallback
  try {
    const parsed = new URL(url)
    return parsed.pathname || fallback
  } catch {
    return fallback
  }
}

const importEnv = import.meta.env

export type AppConfig = {
  appName: string
  version: string
  apiBaseUrl: string
  oidc: {
    issuer: string
    clientId: string
    redirectUri: string
    silentRedirectUri: string
    postLogoutRedirectUri: string
    scope: string
  }
  routes: {
    home: string
    authCallback: string
    silentRefresh: string
    postLogoutRedirect: string
    accounts: string
    market: string
    profile: string
  }
  featureFlags: {
    enableMockedAuth: boolean
  }
}

export const appConfig: AppConfig = {
  appName: getEnv(importEnv.VITE_APP_NAME, 'Thesis Wallet'),
  version: getEnv(importEnv.VITE_APP_VERSION, 'dev'),
  apiBaseUrl: getEnv(importEnv.VITE_API_BASE_URL, 'http://localhost:8000'),
  oidc: {
    issuer: getEnv(
      importEnv.VITE_OIDC_ISSUER,
      'http://localhost:8080/realms/thesis',
    ),
    clientId: getEnv(importEnv.VITE_OIDC_CLIENT_ID, 'frontend'),
    redirectUri: getEnv(importEnv.VITE_OIDC_REDIRECT_URI, `${appOrigin}/auth/callback`),
    silentRedirectUri: getEnv(
      importEnv.VITE_OIDC_SILENT_REDIRECT_URI,
      `${appOrigin}/auth/silent-refresh`,
    ),
    postLogoutRedirectUri: getEnv(
      importEnv.VITE_OIDC_POST_LOGOUT_REDIRECT_URI,
      `${appOrigin}/`,
    ),
    scope: getEnv(importEnv.VITE_OIDC_SCOPE, 'openid profile email thesis-access'),
  },
  routes: {
    home: '/',
    authCallback: getPathname(
      importEnv.VITE_OIDC_REDIRECT_URI,
      '/auth/callback',
    ),
    silentRefresh: getPathname(
      importEnv.VITE_OIDC_SILENT_REDIRECT_URI,
      '/auth/silent-refresh',
    ),
    postLogoutRedirect: getPathname(
      importEnv.VITE_OIDC_POST_LOGOUT_REDIRECT_URI,
      '/',
    ),
    accounts: '/accounts',
    market: '/market',
    profile: '/profile',
  },
  featureFlags: {
    enableMockedAuth: importEnv.VITE_ENABLE_MOCKED_AUTH === 'true',
  },
} as const
