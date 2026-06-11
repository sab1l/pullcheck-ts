/*
 * Responsibility: runtime structural validation for the middleware aggregator payload.
 * Validates shape only — counting and label business rules live in src/domain/.
 */

import { z } from 'zod';
import type { MiddlewarePayload } from '@app-types/middleware.types';

/** Validates the author sub-object within a middleware pull request item. */
export const PullRequestAuthorSchema = z.object({
  username: z.string(),
  role: z.string(),
});

/** Validates the metadata sub-object (draft flag and review comment count) of a pull request. */
export const PullRequestMetaSchema = z.object({
  is_draft: z.boolean(),
  review_comments: z.number().int().nonnegative(),
});

/** Validates a single pull request entry in the middleware aggregator payload. */
export const PullRequestItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: PullRequestAuthorSchema,
  status: z.string(),
  labels: z.array(z.string()),
  meta: PullRequestMetaSchema,
});

/** Validates the full middleware aggregator payload received from an upstream service. */
export const MiddlewarePayloadSchema = z.object({
  product_id: z.string(),
  // null is rejected here by default: z.number() does not accept null unless
  // .nullable() is explicitly added. If the payload sets this field to null or
  // omits it entirely, Zod throws before any domain function is reached.
  total_open_prs: z.number().int().nonnegative(),
  last_updated: z.string(),
  // Same null-rejection guarantee: z.array() requires an actual array value.
  // A null or missing pull_requests field is caught at this schema layer, not
  // in the domain functions which assume pre-validated input.
  pull_requests: z.array(PullRequestItemSchema),
});

// Verify at compile time that the Zod schema output matches our TypeScript interface.
type _SchemaMatchesInterface = z.infer<typeof MiddlewarePayloadSchema> extends MiddlewarePayload
  ? true
  : never;
const _check: _SchemaMatchesInterface = true;
void _check;
