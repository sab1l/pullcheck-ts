// Responsibility: TypeScript interfaces for the middleware aggregator payload shape.
// Mirrors the JSON contract described in Part 2 of the challenge.

export interface PullRequestAuthor {
  username: string;
  role: string;
}

export interface PullRequestMeta {
  is_draft: boolean;
  review_comments: number;
}

export interface PullRequestItem {
  id: number;
  title: string;
  author: PullRequestAuthor;
  status: string;
  labels: string[];
  meta: PullRequestMeta;
}

export interface MiddlewarePayload {
  product_id: string;
  total_open_prs: number;
  last_updated: string;
  pull_requests: PullRequestItem[];
}
