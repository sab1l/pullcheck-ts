// Responsibility: business rule validation for the middleware aggregator payload.
// Each function enforces exactly one rule and throws with a descriptive message on violation.
// Pure functions — no HTTP calls, no schema parsing, no side effects.

import type { MiddlewarePayload } from '../types/middleware.types';

/**
 * Rule 1 — Count integrity.
 *
 * The total_open_prs field must match the actual number of items in pull_requests.
 * A mismatch indicates the aggregator produced an inconsistent payload.
 */
export function assertCountIntegrity(payload: MiddlewarePayload): void {
  const declaredCount = payload.total_open_prs;
  const actualCount = payload.pull_requests.length;

  if (actualCount !== declaredCount) {
    throw new Error(
      `Count integrity violation: total_open_prs is ${declaredCount} ` +
        `but pull_requests contains ${actualCount} item(s)`
    );
  }
}

/**
 * Rule 2 — High-priority PRs must not be drafts.
 *
 * If a PR carries the label "high-priority" it is expected to be ready for review.
 * Marking it as a draft at the same time is a conflicting state that must be caught.
 */
export function assertHighPriorityNotDraft(payload: MiddlewarePayload): void {
  for (const pr of payload.pull_requests) {
    const isHighPriority = pr.labels.includes('high-priority');
    const isDraft = pr.meta.is_draft === true;

    if (isHighPriority && isDraft) {
      throw new Error(
        `Business rule violation: PR #${pr.id} ("${pr.title}") ` +
          `has label "high-priority" but meta.is_draft is true`
      );
    }
  }
}
