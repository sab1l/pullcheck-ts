/*
 * Responsibility: TypeScript interfaces for the GitHub REST API pull request shape.
 * These are the fields we care about; the real API returns more fields which we ignore.
 */

/** The author sub-object embedded in a GitHub pull request response. */
export interface GitHubPullAuthor {
  login: string;
  id: number;
}

/** A single pull request item as returned by the GitHub REST API (subset of fields). */
export interface GitHubPull {
  id: number;
  number: number;
  title: string;
  state: string;
  draft: boolean;
  html_url: string;
  user: GitHubPullAuthor;
  created_at: string;
  updated_at: string;
}
