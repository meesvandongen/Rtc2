import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.STORYBOOK_PORT ?? 6006)
const BASE_URL = process.env.STORYBOOK_URL ?? `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Honour a pre-provisioned browser when the environment supplies one
        // (CI images often pin their own Chromium build); otherwise fall back
        // to the download Playwright manages itself.
        ...(process.env.CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } } : {}),
      },
    },
  ],

  // Tests run against the built Storybook. `vite preview` is used rather than
  // `storybook dev` so the suite exercises the same bundle CI publishes, and so
  // MSW's worker script is served from the site root where it registers.
  webServer: {
    command: `pnpm exec vite preview --outDir storybook-static --port ${PORT} --strictPort --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
