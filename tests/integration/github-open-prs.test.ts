// Part 1 — GitHub open PR integration test.
//
// This test hits the live GitHub REST API to fetch all open pull requests for
// the appwrite/appwrite repository and validates:
//   1. Every PR item matches the expected schema (structural shape via Zod).
//   2. The count of eligible PRs (open + not draft) is consistent and non-zero.
//
// It is an integration test because it depends on network access. In CI it runs
// with the GITHUB_TOKEN secret (5000 req/hr). Without a token the rate limit is
// 60 req/hr, which is enough for one run of this test.

import { test, expect } from '@playwright/test';
import { fetchAllOpenPulls } from '@api/github-client';
import { GitHubPullSchema } from '@schemas/github-pull.schema';
import {
  filterEligibleOpenPrs,
  countEligibleOpenPrs,
} from '@domain/open-pr-rules';
import type { GitHubPull } from '@app-types/github.types';

const TARGET_REPO = 'appwrite/appwrite';

// Populated once in beforeAll and shared across both tests in this suite.
// Declared outside the describe block so both tests can read it directly.
let sharedPulls: GitHubPull[] = [];

test.describe(`GitHub open PRs — ${TARGET_REPO}`, () => {
  // Serial mode is required here because fullyParallel: true is set globally.
  // Without it, each test would run in its own worker and beforeAll would execute
  // once per worker — fetching the full PR list twice instead of once.
  // With serial mode, beforeAll runs once in a single worker before both tests.
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => {
    sharedPulls = await fetchAllOpenPulls(request, TARGET_REPO);
  });

  test('fetches all pages and every item matches the expected schema', async () => {
    // We must receive at least one PR for the assertion to be meaningful.
    // If this fails, either the repo is empty or the API call itself failed.
    expect(sharedPulls.length).toBeGreaterThan(0);

    // Validate each item against the Zod schema.
    // Collect all failures so the error output shows every offending PR at once,
    // rather than stopping at the first one.
    const schemaFailures: string[] = [];

    for (const item of sharedPulls) {
      const result = GitHubPullSchema.safeParse(item);

      if (!result.success) {
        const errorSummary = result.error.issues
          .map((issue) => `  field="${issue.path.join('.')}" message="${issue.message}"`)
          .join('\n');

        schemaFailures.push(`PR #${item.number} (id=${item.id}) failed schema:\n${errorSummary}`);
      }
    }

    expect(
      schemaFailures,
      `${schemaFailures.length} PR(s) failed schema validation:\n${schemaFailures.join('\n---\n')}`
    ).toHaveLength(0);
  });

  test('eligible open PR count is consistent and non-zero', async () => {
    const eligiblePulls = filterEligibleOpenPrs(sharedPulls);
    const eligibleCount = countEligibleOpenPrs(sharedPulls);

    // The two helper functions must agree with each other (filterEligibleOpenPrs
    // is the implementation that countEligibleOpenPrs delegates to).
    expect(eligibleCount).toBe(eligiblePulls.length);

    // There should be at least one open non-draft PR in an active repository.
    expect(eligibleCount).toBeGreaterThan(0);

    // Attach a structured summary to the test result so it appears in every report
    // (HTML, JUnit XML) regardless of pass/fail status.
    test.info().annotations.push({
      type: 'summary',
      description:
        `Total fetched: ${sharedPulls.length} | ` +
        `Eligible (open, not draft): ${eligibleCount} | ` +
        `Excluded (draft): ${sharedPulls.length - eligibleCount}`,
    });
  });
});
