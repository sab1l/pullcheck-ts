// Responsibility: runtime structural validation for the middleware aggregator payload.
// Validates shape only — counting and label business rules live in src/domain/.

import { z } from 'zod';
import type { MiddlewarePayload } from '../types/middleware.types';

export const PullRequestAuthorSchema = z.object({
  username: z.string(),
  role: z.string(),
});

export const PullRequestMetaSchema = z.object({
  is_draft: z.boolean(),
  review_comments: z.number().int().nonnegative(),
});

export const PullRequestItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: PullRequestAuthorSchema,
  status: z.string(),
  labels: z.array(z.string()),
  meta: PullRequestMetaSchema,
});

export const MiddlewarePayloadSchema = z.object({
  product_id: z.string(),
  total_open_prs: z.number().int().nonnegative(),
  last_updated: z.string(),
  pull_requests: z.array(PullRequestItemSchema),
});

// Verify at compile time that the Zod schema output matches our TypeScript interface.
type _SchemaMatchesInterface = z.infer<typeof MiddlewarePayloadSchema> extends MiddlewarePayload
  ? true
  : never;
const _check: _SchemaMatchesInterface = true;
void _check;
