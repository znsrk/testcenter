import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/static',
  timeout: 40_000,
  expect: { timeout: 15_000 },
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4180' },
  webServer: {
    command: 'npm run dev:web -- --host 127.0.0.1 --port 4180 --strictPort',
    url: 'http://127.0.0.1:4180',
    reuseExistingServer: false,
    env: { VITE_ACCESS_CODE: 'friends-test-code' },
  },
})
