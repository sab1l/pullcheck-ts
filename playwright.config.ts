import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Run unit and integration tests from the tests/ directory
  testDir: './tests',

  // Each test file gets a fresh browser context; timeout generous for live API
  timeout: 30_000,

  /*
   * Use 2 workers to match the 2 vCPUs available on GitHub Actions free runners.
   * Works well locally too — conservative enough to avoid resource contention.
   */
  workers: 2,

  /*
   * Allow every individual test to run in its own worker slot rather than
   * serialising all tests within a file. Without this, workers > 1 has no
   * effect when all tests live in a single file (which is our case for both
   * the unit and integration test suites).
   */
  fullyParallel: true,

  /*
   * Two reporters run in parallel on every test run:
   *   line  — one-line-per-test terminal output for local dev and CI logs
   *   junit — JUnit XML written to test-results/results.xml for CI tooling
   *           (GitHub Actions, Jenkins, etc.) to parse counts, durations, and failures.
   *           test-results/ is .gitignored so the XML is never committed.
   */
  reporter: [
    ['line'],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],

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
      /*
       * Unit tests exercise pure functions with no external dependencies.
       * A failure here is always a code or logic problem — retrying would only
       * hide the defect and slow down feedback.
       */
      retries: 0,
    },
    {
      name: 'integration',
      testDir: './tests/integration',
      /*
       * Integration tests hit the live GitHub API and can fail due to transient
       * network issues (rate limit spike, DNS timeout, API blip). Up to 3 retries
       * let Playwright distinguish:
       *   - Flaky test: fails then passes on a retry → marked as "flaky" in
       *     the JUnit XML and terminal output; CI does not block on flaky.
       *   - Broken test: fails all 3 retries → marked as "failed"; CI blocks.
       */
      retries: 3,
    },
  ],
});
