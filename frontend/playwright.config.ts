import { defineConfig, devices } from '@playwright/test'

const PORT = 5173

export default defineConfig({
  timeout: 120_000,
  testDir: 'tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'only-on-failure',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host localhost --port 5173',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

