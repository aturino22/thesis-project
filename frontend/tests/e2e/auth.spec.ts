import { expect, test } from '@playwright/test'

const CLIENT_ID = 'frontend'
const KEYCLOAK_HEALTH_URL =
  'http://localhost:8080/realms/thesis/.well-known/openid-configuration'
const KEYCLOAK_TOKEN_URL =
  'http://localhost:8080/realms/thesis/protocol/openid-connect/token'
const EXPECTED_SCOPES = ['openid', 'thesis-access']

const decodeJwtPayload = (token: string) => {
  const [, payload] = token.split('.')
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
  const padded =
    normalized + '==='.slice((normalized.length + 3) % 4) // pad base64 if needed
  const json = Buffer.from(padded, 'base64').toString('utf-8')
  return JSON.parse(json) as { scope?: string; realm_access?: { roles?: string[] } }
}

const waitForKeycloak = async () => {
  const maxAttempts = 30
  const delayMs = 2000

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(KEYCLOAK_HEALTH_URL, { method: 'GET' })
      if (response.ok) {
        return
      }
    } catch {
      // ignore until available
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  throw new Error('Keycloak non raggiungibile su http://localhost:8080')
}

test.describe.configure({ mode: 'serial' })

test('Login Keycloak e silent refresh', async ({ page, request }) => {
  await waitForKeycloak()

  await page.goto('/')
  const loginButton = page.getByRole('button', { name: 'Accedi con Keycloak' })
  await expect(loginButton).toBeVisible()

  await loginButton.click()
  await page.waitForURL('http://localhost:8080/**', { timeout: 20_000 })

  await page.locator('#username').fill('demo-user')
  await page.locator('#password').fill('DemoPassword!123')
  await page.locator('#kc-login').click()

  if (page.url().startsWith('http://localhost:8080')) {
    const updateHeading = page
      .getByRole('heading', { name: 'Update Account Information' })
      .first()
    const shouldCompleteProfile = await updateHeading.isVisible({ timeout: 2_000 }).catch(
      () => false,
    )
    if (shouldCompleteProfile) {
      await page.locator('#firstName').fill('Demo')
      await page.locator('#lastName').fill('User')
      await page.getByRole('button', { name: 'Submit' }).click()
    }
  }

  await page.waitForURL('http://localhost:5173/**', { timeout: 20_000 })

  const sessionHandle = await page.waitForFunction(() => {
    const key = Object.keys(sessionStorage).find((k) => k.startsWith('oidc.user:'))
    if (!key) return null
    const json = sessionStorage.getItem(key)
    if (!json) return null
    try {
      const parsed = JSON.parse(json)
      if (!parsed?.access_token) {
        return null
      }
      return { key, state: parsed }
    } catch {
      return null
    }
  }, null, { timeout: 20_000 })

  const sessionValue = await sessionHandle.jsonValue<{
    key: string
    state: Record<string, unknown>
  }>()
  expect(sessionValue?.key).toBeTruthy()

  await page.waitForFunction(() => window.location.pathname === '/', {
    timeout: 15_000,
  })
  await expect(page.getByText('Sessione attiva')).toBeVisible({ timeout: 10_000 })

  const oidcState = (sessionValue?.state ??
    {}) as {
    scope: string
    access_token: string
    refresh_token: string
  }

  expect(oidcState.scope).toBeTruthy()
  const scopes = String(oidcState.scope).split(' ')
  for (const expected of EXPECTED_SCOPES) {
    expect(scopes).toContain(expected)
  }

  const accessToken = oidcState.access_token as string
  const refreshToken = oidcState.refresh_token as string
  expect(accessToken).toBeTruthy()
  expect(refreshToken).toBeTruthy()

  const payload = decodeJwtPayload(accessToken)
  const scopeFromToken = String(payload.scope ?? '').split(' ')
  for (const expected of EXPECTED_SCOPES) {
    expect(scopeFromToken).toContain(expected)
  }

  const refreshResponse = await request.post(KEYCLOAK_TOKEN_URL, {
    form: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    },
  })

  expect(refreshResponse.ok()).toBeTruthy()
  const refreshed = await refreshResponse.json()
  expect(refreshed.access_token).toBeTruthy()
  expect(refreshed.refresh_token).toBeTruthy()

  const refreshedPayload = decodeJwtPayload(String(refreshed.access_token))
  const refreshedScopes = String(refreshedPayload.scope ?? '').split(' ')
  for (const expected of EXPECTED_SCOPES) {
    expect(refreshedScopes).toContain(expected)
  }
})
