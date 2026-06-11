// Responsibility: business rule validation for the middleware aggregator payload.
// Each function enforces exactly one rule and throws with a descriptive message on violation.
// Pure functions — no HTTP calls, no schema parsing, no side effects.
//
// Assumption: callers must parse the payload through MiddlewarePayloadSchema before
// calling these functions. The TypeScript types guarantee non-null values here;
// null fields are rejected at the schema layer before execution reaches this module.

import type { MiddlewarePayload } from '@app-types/middleware.types';
import { IntegrityError, BusinessRuleError } from '@errors/index';

/**
 * Rule 1 — Count integrity.
 *
 * The total_open_prs field must match the actual number of items in pull_requests.
 * A mismatch indicates the aggregator produced an inconsistent payload.
 *
 * Assumption: payload.total_open_prs and payload.pull_requests are guaranteed
 * non-null by the schema validation layer.
 */
export function assertCountIntegrity(payload: MiddlewarePayload): void {
  const declaredCount = payload.total_open_prs;
  const actualCount = payload.pull_requests.length;

  if (actualCount !== declaredCount) {
    throw new IntegrityError(
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
 *
 * This is a soft assert: all PRs in the list are evaluated before throwing.
 * Every violation is collected so a single run surfaces all offending PRs at once,
 * rather than stopping at the first one and requiring multiple re-runs to find them all.
 *
 * Logic note on the guard condition (isHighPriority && isDraft):
 *   - false && false → condition is false → no violation recorded (correct: PR is neither)
 *   - true  && false → condition is false → no violation recorded (correct: high-priority but not draft)
 *   - false && true  → condition is false → no violation recorded (correct: draft but not high-priority)
 *   - true  && true  → condition is true  → violation recorded (rule broken)
 *
 * Assumption: payload.pull_requests is guaranteed non-null by the schema validation layer.
 */
export function assertHighPriorityNotDraft(payload: MiddlewarePayload): void {
  const violations: string[] = [];

  for (const pr of payload.pull_requests) {
    const isHighPriority = pr.labels.includes('high-priority');
    const isDraft = pr.meta.is_draft === true;

    if (isHighPriority && isDraft) {
      violations.push(
        `PR #${pr.id} ("${pr.title}") has label "high-priority" but meta.is_draft is true`
      );
    }
  }

  if (violations.length > 0) {
    throw new BusinessRuleError(
      `Business rule violation(s) — high-priority PRs must not be drafts:\n` +
        violations.join('\n')
    );
  }
}
