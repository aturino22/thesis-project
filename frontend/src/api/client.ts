import { appConfig } from '@/config/appConfig'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type ApiClient = {
  request: <TResponse, TBody = unknown>(input: {
    path: string
    method?: HttpMethod
    body?: TBody
    headers?: Record<string, string>
  }) => Promise<TResponse>
}

export type ApiClientFactory = (options: {
  getAccessToken: () => Promise<string | null>
}) => ApiClient

export const createApiClient: ApiClientFactory = ({ getAccessToken }) => {
  const baseUrl = new URL(appConfig.apiBaseUrl)

  return {
    async request<TResponse, TBody = unknown>({
      path,
      method = 'GET',
      body,
      headers = {},
    }: {
      path: string
      method?: HttpMethod
      body?: TBody
      headers?: Record<string, string>
    }): Promise<TResponse> {
      const url = new URL(path, baseUrl).toString()
      const token = await getAccessToken()

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const fallbackMessage = `API request failed with status ${response.status}`
        let detail: unknown
        try {
          detail = await response.json()
        } catch {
          // non-json response
        }

        const error = new Error(fallbackMessage)
        ;(error as Error & { status?: number; detail?: unknown }).status =
          response.status
        ;(error as Error & { status?: number; detail?: unknown }).detail = detail
        throw error
      }

      if (response.status === 204) {
        return undefined as TResponse
      }

      return (await response.json()) as TResponse
    },
  }
}

