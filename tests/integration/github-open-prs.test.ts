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

const TARGET_REPO = 'appwrite/appwrite';

test.describe(`GitHub open PRs — ${TARGET_REPO}`, () => {
  test('fetches all pages and every item matches the expected schema', async ({
    request,
  }) => {
    const rawPulls = await fetchAllOpenPulls(request, TARGET_REPO);

    // We must receive at least one PR for the assertion to be meaningful.
    // If this fails, either the repo is empty or the API call itself failed.
    expect(rawPulls.length).toBeGreaterThan(0);

    // Validate each item against the Zod schema.
    // Collect all failures so the error output shows every offending PR at once,
    // rather than stopping at the first one.
    const schemaFailures: string[] = [];

    for (const item of rawPulls) {
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

  test('eligible open PR count is consistent and non-zero', async ({ request }) => {
    const rawPulls = await fetchAllOpenPulls(request, TARGET_REPO);

    const eligiblePulls = filterEligibleOpenPrs(rawPulls);
    const eligibleCount = countEligibleOpenPrs(rawPulls);

    // The two helper functions must agree with each other (filterEligibleOpenPrs
    // is the implementation that countEligibleOpenPrs delegates to).
    expect(eligibleCount).toBe(eligiblePulls.length);

    // There should be at least one open non-draft PR in an active repository.
    expect(eligibleCount).toBeGreaterThan(0);

    // Log a human-readable summary for CI output, even on success.
    console.log(
      `[${TARGET_REPO}] Total fetched: ${rawPulls.length} | ` +
        `Eligible (open, not draft): ${eligibleCount} | ` +
        `Excluded (draft): ${rawPulls.length - eligibleCount}`
    );
  });
});
