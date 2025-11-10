import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

const DEFAULT_DEV_PORT = 5173
const DEFAULT_PREVIEW_PORT = 4173
const DEFAULT_HOST = '0.0.0.0'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const apiBaseUrl = env.VITE_API_BASE_URL ?? 'http://localhost:8000'
  const proxy: Record<string, string | ProxyOptions> | undefined = env.VITE_API_BASE_URL
    ? {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
        },
      }
    : undefined

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: env.VITE_DEV_SERVER_HOST ?? DEFAULT_HOST,
      port: Number(env.VITE_DEV_SERVER_PORT ?? DEFAULT_DEV_PORT),
      open: false,
      proxy,
    },
    preview: {
      host: env.VITE_PREVIEW_HOST ?? DEFAULT_HOST,
      port: Number(env.VITE_PREVIEW_PORT ?? DEFAULT_PREVIEW_PORT),
    },
  }
})
