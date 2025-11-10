import type { PropsWithChildren } from 'react'
import { AuthProvider } from 'react-oidc-context'
import { oidcConfig } from '@/auth/oidcConfig'

export function OidcProvider({ children }: PropsWithChildren<unknown>) {
  return <AuthProvider {...oidcConfig}>{children}</AuthProvider>
}
