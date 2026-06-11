/*
 * Responsibility: TypeScript interfaces for the middleware aggregator payload shape.
 * Mirrors the JSON contract described in Part 2 of the challenge.
 */

/** Author identity as represented in the middleware aggregator payload. */
export interface PullRequestAuthor {
  username: string;
  role: string;
}

/** Metadata flags and metrics attached to each pull request in the middleware payload. */
export interface PullRequestMeta {
  is_draft: boolean;
  review_comments: number;
}

/** A single pull request entry in the middleware aggregator payload. */
export interface PullRequestItem {
  id: number;
  title: string;
  author: PullRequestAuthor;
  status: string;
  labels: string[];
  meta: PullRequestMeta;
}

/** The full payload shape produced by the middleware aggregator service. */
export interface MiddlewarePayload {
  product_id: string;
  total_open_prs: number;
  last_updated: string;
  pull_requests: PullRequestItem[];
}
