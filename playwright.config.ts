/**
 * Playwright configuration for E2E tests
 * Targets: Admin app at localhost:3001
 */
import { defineConfig, devices } from 'playwright/test';
// @ts-ignore - playwright is installed at root, not as @playwright/test

export default defineConfig({
  // Test directory
  testDir: './apps/admin/__tests__/e2e',

  // Test timeout
  timeout: 60 * 1000,

  // Retry on failure in CI
  retries: process.env.CI ? 2 : 0,

  // Parallel execution
  workers: 1, // Sequential for stateful admin tests

  // Reporter
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  // Global settings
  use: {
    // Base URL for navigation shortcuts
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://192.168.45.19:3001',

    // Browser options
    headless: true,

    // Screenshots on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',

    // Tracing on first retry
    trace: 'on-first-retry',

    // Navigation timeout
    navigationTimeout: 30000,

    // Action timeout
    actionTimeout: 15000,
  },

  // Test projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer — admin app is expected to be running
  // webServer: {
  //   command: 'pnpm --filter @widget-creator/admin dev',
  //   url: 'http://localhost:3001',
  //   reuseExistingServer: true,
  //   timeout: 60000,
  // },
});
