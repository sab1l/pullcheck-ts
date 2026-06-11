// Responsibility: TypeScript interfaces for the GitHub REST API pull request shape.
// These are the fields we care about; the real API returns more fields which we ignore.

export interface GitHubPullAuthor {
  login: string;
  id: number;
}

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
