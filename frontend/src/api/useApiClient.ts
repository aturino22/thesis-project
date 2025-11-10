import { useMemo } from 'react'
import { useAuth } from 'react-oidc-context'
import { createApiClient } from '@/api/client'

export function useApiClient() {
  const auth = useAuth()
  const accessToken = auth.user?.access_token ?? null
  const isExpired = auth.user?.expired ?? false
  const isAuthenticated = auth.isAuthenticated
  const signinSilent = auth.signinSilent

  return useMemo(
    () =>
      createApiClient({
        getAccessToken: async () => {
          if (accessToken && !isExpired) {
            return accessToken
          }

          if (isAuthenticated && typeof signinSilent === 'function') {
            try {
              const renewed = await signinSilent()
              if (renewed?.access_token && !renewed.expired) {
                return renewed.access_token
              }
            } catch (error) {
              console.warn('Silent signin failed', error)
            }
          }

          return null
        },
      }),
    [accessToken, isExpired, isAuthenticated, signinSilent],
  )
}

