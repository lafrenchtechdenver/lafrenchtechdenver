import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 *
 * Milestone 1 ships a single smoke spec. Later milestones will add nav,
 * theme, mobile-menu, external-content, content, and a11y specs alongside
 * the features they cover — all pointed at the same preview server below.
 */

const PORT = 4321;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Build first so preview has something to serve; `pnpm preview` itself
    // does not trigger a build in Astro.
    command: 'pnpm build && pnpm preview',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000,
  },
});
