// Part 2 — Middleware payload validation tests.
//
// These tests exercise the Zod schema (structural shape) and the domain rules
// (business logic) for the middleware aggregator payload.
//
// No HTTP calls are made here — all input comes from committed fixtures or
// inline mutations of those fixtures.

import { test, expect } from '@playwright/test';
import { MiddlewarePayloadSchema } from '@schemas/middleware-payload.schema';
import {
  assertCountIntegrity,
  assertHighPriorityNotDraft,
} from '@domain/middleware-rules';
import { IntegrityError, BusinessRuleError } from '@errors/index';
import type { MiddlewarePayload } from '@app-types/middleware.types';
import sampleJson from '@fixtures/middleware-sample.json';

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Parses the sample fixture through the Zod schema.
 * Returns a fully-typed MiddlewarePayload or throws if the fixture is invalid.
 */
function loadSamplePayload(): MiddlewarePayload {
  return MiddlewarePayloadSchema.parse(sampleJson);
}

// ─── schema validation ───────────────────────────────────────────────────────

test.describe('MiddlewarePayload — schema validation', () => {
  test('sample fixture passes the Zod schema without errors', () => {
    // If parse throws, the test fails with the Zod error message automatically.
    const result = MiddlewarePayloadSchema.safeParse(sampleJson);

    expect(result.success).toBe(true);
  });

  test('rejects a payload where total_open_prs is a string instead of a number', () => {
    const malformed = {
      ...sampleJson,
      total_open_prs: 'one', // wrong type
    };

    const result = MiddlewarePayloadSchema.safeParse(malformed);

    expect(result.success).toBe(false);
    if (!result.success) {
      // Confirm the error points at the right field
      const fieldPath = result.error.issues[0].path.join('.');
      expect(fieldPath).toBe('total_open_prs');
    }
  });

  test('rejects a payload where total_open_prs is null', () => {
    const malformed = { ...sampleJson, total_open_prs: null };

    const result = MiddlewarePayloadSchema.safeParse(malformed);

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldPath = result.error.issues[0].path.join('.');
      expect(fieldPath).toBe('total_open_prs');
    }
  });

  test('rejects a payload where pull_requests is null', () => {
    const malformed = { ...sampleJson, pull_requests: null };

    const result = MiddlewarePayloadSchema.safeParse(malformed);

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldPath = result.error.issues[0].path.join('.');
      expect(fieldPath).toBe('pull_requests');
    }
  });

  test('rejects a payload where a PR is missing the required labels field', () => {
    const prWithoutLabels = { ...sampleJson.pull_requests[0] };
    // @ts-expect-error — intentionally testing malformed input
    delete prWithoutLabels.labels;

    const malformed = {
      ...sampleJson,
      pull_requests: [prWithoutLabels],
    };

    const result = MiddlewarePayloadSchema.safeParse(malformed);

    expect(result.success).toBe(false);
  });
});

// ─── business rule: count integrity ──────────────────────────────────────────

test.describe('assertCountIntegrity — Rule 1', () => {
  test('passes when pull_requests.length matches total_open_prs', () => {
    const payload = loadSamplePayload();

    // Should not throw
    expect(() => assertCountIntegrity(payload)).not.toThrow();
  });

  test('throws an IntegrityError when total_open_prs does not match actual array length', () => {
    const payload = loadSamplePayload();

    // Declare 2 PRs but only provide 1
    const mismatchedPayload: MiddlewarePayload = {
      ...payload,
      total_open_prs: 2,
    };

    expect(() => assertCountIntegrity(mismatchedPayload)).toThrow(IntegrityError);
    expect(() => assertCountIntegrity(mismatchedPayload)).toThrowError(
      /total_open_prs is 2 but pull_requests contains 1 item/
    );
  });
});

// ─── business rule: high-priority must not be draft ──────────────────────────

test.describe('assertHighPriorityNotDraft — Rule 2', () => {
  test('passes when a high-priority PR is not a draft', () => {
    // The sample fixture has a high-priority PR with is_draft=false — should pass
    const payload = loadSamplePayload();

    expect(() => assertHighPriorityNotDraft(payload)).not.toThrow();
  });

  test('throws a BusinessRuleError when a high-priority PR is also marked as draft', () => {
    const payload = loadSamplePayload();

    // Mutate the first PR: keep high-priority label, flip is_draft to true
    const violatingPr = {
      ...payload.pull_requests[0],
      meta: { ...payload.pull_requests[0].meta, is_draft: true },
    };

    const violatingPayload: MiddlewarePayload = {
      ...payload,
      pull_requests: [violatingPr],
    };

    expect(() => assertHighPriorityNotDraft(violatingPayload)).toThrow(BusinessRuleError);
    expect(() => assertHighPriorityNotDraft(violatingPayload)).toThrowError(
      /PR #1024.*high-priority.*is_draft is true/
    );
  });

  test('collects all violations before throwing (soft assert)', () => {
    const payload = loadSamplePayload();

    // Two PRs that each violate the rule independently
    const violatingPrA = {
      ...payload.pull_requests[0],
      id: 100,
      title: 'PR A',
      meta: { ...payload.pull_requests[0].meta, is_draft: true },
    };
    const violatingPrB = {
      ...payload.pull_requests[0],
      id: 200,
      title: 'PR B',
      meta: { ...payload.pull_requests[0].meta, is_draft: true },
    };

    const multiViolationPayload: MiddlewarePayload = {
      ...payload,
      total_open_prs: 2,
      pull_requests: [violatingPrA, violatingPrB],
    };

    let caughtError: unknown;
    try {
      assertHighPriorityNotDraft(multiViolationPayload);
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(BusinessRuleError);
    // Both violations must appear in the single thrown error message
    expect((caughtError as BusinessRuleError).message).toMatch(/PR #100/);
    expect((caughtError as BusinessRuleError).message).toMatch(/PR #200/);
  });

  test('passes when a draft PR does not carry the high-priority label', () => {
    // isHighPriority=false, isDraft=true → false && true → no violation
    const payload = loadSamplePayload();

    const draftPrWithoutHighPriority = {
      ...payload.pull_requests[0],
      labels: ['backend'], // high-priority removed
      meta: { ...payload.pull_requests[0].meta, is_draft: true },
    };

    const safePayload: MiddlewarePayload = {
      ...payload,
      pull_requests: [draftPrWithoutHighPriority],
    };

    expect(() => assertHighPriorityNotDraft(safePayload)).not.toThrow();
  });

  test('passes when a PR has neither high-priority label nor is_draft set', () => {
    // isHighPriority=false, isDraft=false → false && false → no violation
    const payload = loadSamplePayload();

    const regularPr = {
      ...payload.pull_requests[0],
      labels: ['backend'],
      meta: { ...payload.pull_requests[0].meta, is_draft: false },
    };

    const safePayload: MiddlewarePayload = {
      ...payload,
      pull_requests: [regularPr],
    };

    expect(() => assertHighPriorityNotDraft(safePayload)).not.toThrow();
  });
});
