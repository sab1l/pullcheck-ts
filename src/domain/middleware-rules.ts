// Business rule validation for the middleware aggregator payload.
// Pure functions — no HTTP calls, no schema parsing, no side effects.
// Callers must parse input through MiddlewarePayloadSchema before calling these functions.

import type { MiddlewarePayload } from '@app-types/middleware.types';
import { IntegrityError, BusinessRuleError } from '@errors/index';

/**
 * Rule 1 — Count integrity.
 * total_open_prs must match the actual length of pull_requests.
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
 * Soft assert: all PRs are evaluated before throwing so every violation
 * surfaces in a single run rather than requiring multiple re-runs.
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
