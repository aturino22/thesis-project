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

        let message = fallbackMessage
        if (typeof detail === 'string' && detail.trim().length > 0) {
          message = detail
        } else if (
          detail &&
          typeof detail === 'object' &&
          'detail' in (detail as Record<string, unknown>)
        ) {
          const extracted = (detail as { detail?: unknown }).detail
          if (typeof extracted === 'string' && extracted.trim().length > 0) {
            message = extracted
          } else if (Array.isArray(extracted) && extracted.length > 0) {
            const messages = extracted
              .map((item) => {
                if (typeof item === 'string') {
                  return item
                }
                if (
                  item &&
                  typeof item === 'object' &&
                  'msg' in item &&
                  typeof item.msg === 'string'
                ) {
                  return item.msg
                }
                return null
              })
              .filter((value): value is string => Boolean(value))
            if (messages.length > 0) {
              message = messages.join(' ')
            }
          }
        }

        const error = new Error(message)
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

