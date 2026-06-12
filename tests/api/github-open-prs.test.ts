// Part 1 — Live GitHub API test. Validates PR structure and eligible-count rule.
// Requires network access; set GITHUB_TOKEN to avoid the 60 req/hr unauthenticated limit.

import { test, expect } from '@playwright/test';
import { fetchAllOpenPulls } from '@api/github-client';
import { GitHubPullSchema } from '@schemas/github-pull.schema';
import {
  filterEligibleOpenPrs,
  countEligibleOpenPrs,
} from '@domain/open-pr-rules';
import type { GitHubPull } from '@app-types/github.types';
import { TARGET_REPO } from '@config';

let sharedPulls: GitHubPull[] = [];

test.describe(`GitHub open PRs — ${TARGET_REPO}`, () => {
  // serial: fullyParallel is true globally; without serial each worker runs
  // beforeAll independently, fetching the full PR list once per worker.
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => {
    sharedPulls = await fetchAllOpenPulls(request, TARGET_REPO);
  });

  test('fetches all pages and every item matches the expected schema', async () => {
    expect(sharedPulls.length).toBeGreaterThan(0);

    // Collect all failures so a single run surfaces every offending PR.
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

    // The two helpers must agree — countEligibleOpenPrs delegates to filterEligibleOpenPrs.
    expect(eligibleCount).toBe(eligiblePulls.length);
    expect(eligibleCount).toBeGreaterThan(0);

    test.info().annotations.push({
      type: 'summary',
      description:
        `Total fetched: ${sharedPulls.length} | ` +
        `Eligible (open, not draft): ${eligibleCount} | ` +
        `Excluded (draft): ${sharedPulls.length - eligibleCount}`,
    });
  });
});
