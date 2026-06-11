/*
 * Responsibility: business rules for counting eligible open pull requests.
 * Pure functions — no HTTP calls, no Zod parsing, no side effects.
 */

import type { GitHubPull } from '@app-types/github.types';

/**
 * Returns only the PRs that count toward the open PR total.
 *
 * Rules (from the challenge spec):
 *   - state must be "open"
 *   - draft must be false
 *
 * We re-check state even though the GitHub API was called with state=open
 * as a defensive measure against unexpected payloads or future API changes.
 */
export function filterEligibleOpenPrs(pulls: GitHubPull[]): GitHubPull[] {
  return pulls.filter((pr) => {
    const isOpen = pr.state === 'open';
    const isNotDraft = pr.draft === false;
    return isOpen && isNotDraft;
  });
}

/**
 * Returns the count of PRs that are open and not drafts.
 * Delegates filtering to filterEligibleOpenPrs so the rule is defined once.
 */
export function countEligibleOpenPrs(pulls: GitHubPull[]): number {
  return filterEligibleOpenPrs(pulls).length;
}
