// Responsibility: runtime structural validation for a single GitHub API pull request item.
// Uses Zod so that any unexpected shape from the API surface fails with a clear field path.
// Business rules (open state, draft exclusion) live in src/domain/, not here.

import { z } from 'zod';
import type { GitHubPull } from '@app-types/github.types';

export const GitHubPullAuthorSchema = z.object({
  login: z.string(),
  id: z.number(),
});

export const GitHubPullSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  state: z.string(),
  draft: z.boolean(),
  html_url: z.string().url(),
  user: GitHubPullAuthorSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

// Verify at compile time that the Zod schema output matches our TypeScript interface.
// If the two ever diverge, this line will produce a type error.
type _SchemaMatchesInterface = z.infer<typeof GitHubPullSchema> extends GitHubPull
  ? true
  : never;
const _check: _SchemaMatchesInterface = true;
void _check;
