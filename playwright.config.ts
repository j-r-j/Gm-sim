import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for NFL GM Simulator E2E tests.
 * Tests run against the Expo web version of the app.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially since game state matters
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for sequential game flow
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Generous timeouts for game simulations
  timeout: 120_000, // 2 minutes per test
  expect: {
    timeout: 10_000, // 10 seconds for assertions
  },

  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Start the Expo web server before tests
  webServer: {
    command: 'npm run web -- --non-interactive',
    url: 'http://localhost:8081',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
