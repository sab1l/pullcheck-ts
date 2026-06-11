import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Run unit and integration tests from the tests/ directory
  testDir: './tests',

  // Each test file gets a fresh browser context; timeout generous for live API
  timeout: 30_000,

  // Show one test per line in the terminal for easy CI reading
  reporter: 'line',

  use: {
    // Base URL not set — the GitHub API client builds its own full URLs
    extraHTTPHeaders: {
      Accept: 'application/vnd.github+json',
      // GITHUB_TOKEN is optional; set it in CI to raise the rate limit from 60 to 5000 req/hr
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
  },

  projects: [
    {
      name: 'unit',
      testDir: './tests/unit',
    },
    {
      name: 'integration',
      testDir: './tests/integration',
    },
  ],
});
