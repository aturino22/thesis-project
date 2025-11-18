export const MFA_SESSION_STORAGE_KEY = 'mfaSessionExpiresAt'

export const getStoredMfaSessionExpiry = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage.getItem(MFA_SESSION_STORAGE_KEY)
}

export const storeMfaSessionExpiry = (expiresAt: string) => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(MFA_SESSION_STORAGE_KEY, expiresAt)
}

export const clearMfaSessionExpiry = () => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(MFA_SESSION_STORAGE_KEY)
}

export const isMfaSessionStillValid = (): boolean => {
  const expiresAt = getStoredMfaSessionExpiry()
  if (!expiresAt) {
    return false
  }
  return new Date(expiresAt).getTime() > Date.now()
}
