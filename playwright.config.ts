import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  fullyParallel: false,
  globalTeardown: './tests/browser-shutdown.js',
  timeout: 40_000,
  expect: { timeout: 12_000 },
  use: { baseURL: 'http://127.0.0.1:4179', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node tests/e2e-server.js',
    url: 'http://127.0.0.1:4179/api/health',
    reuseExistingServer: false,
  },
})
