import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  // 2 workers matches the 2 vCPUs on GitHub Actions free runners.
  workers: 2,
  // fullyParallel lets each test file run in its own worker slot.
  fullyParallel: true,

  reporter: [
    ['line'],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],

  use: {
    extraHTTPHeaders: {
      Accept: 'application/vnd.github+json',
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
  },

  projects: [
    {
      name: 'unit',
      testDir: './tests/unit',
      retries: 0,
    },
    {
      name: 'api',
      testDir: './tests/api',
      // Live API calls can fail on transient network issues; retries let Playwright
      // distinguish flaky (passes on retry) from broken (fails all retries).
      retries: 3,
    },
  ],
});
