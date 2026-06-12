import type { APIRequestContext } from '@playwright/test';
import type { GitHubPull } from '@app-types/github.types';
import { GITHUB_API_BASE } from '@config';

const PAGE_SIZE = 100;
const MAX_PAGES = 50;
// 50 pages × 100 items = 5000 PRs — well beyond any real repo's open PR count.

const MAX_ERROR_BODY_LENGTH = 500;

export type PullsState = 'open' | 'closed' | 'all';

/**
 * Fetches every pull request matching `state` for the given repository,
 * paginating automatically until an empty page signals the end.
 *
 * @param request - Playwright's APIRequestContext (carries auth headers from playwright.config.ts).
 * @param repo    - Repository in "owner/name" format, e.g. "appwrite/appwrite".
 * @param state   - PR state filter passed to the GitHub API. Defaults to `'open'`.
 * @returns Flat array of all matching PR objects across all pages.
 */
export async function fetchAllPullRequests(
  request: APIRequestContext,
  repo: string,
  state: PullsState = 'open'
): Promise<GitHubPull[]> {
  const allPulls: GitHubPull[] = [];
  let currentPage = 1;

  while (currentPage <= MAX_PAGES) {
    const response = await request.get(`${GITHUB_API_BASE}/repos/${repo}/pulls`, {
      params: {
        state,
        per_page: String(PAGE_SIZE),
        page: String(currentPage),
      },
    });

    if (!response.ok()) {
      const raw = await response.text();
      const body = raw.length > MAX_ERROR_BODY_LENGTH
        ? `${raw.slice(0, MAX_ERROR_BODY_LENGTH)} (truncated)`
        : raw;
      throw new Error(
        `GitHub API request failed — status ${response.status()} on page ${currentPage}. Body: ${body}`
      );
    }

    const pageItems: GitHubPull[] = await response.json();

    // Empty page means all available PRs have been retrieved.
    if (pageItems.length === 0) {
      break;
    }

    allPulls.push(...pageItems);
    currentPage += 1;
  }

  if (currentPage > MAX_PAGES) {
    throw new Error(
      `Pagination safety limit reached: fetched ${MAX_PAGES} pages (${MAX_PAGES * PAGE_SIZE} PRs) ` +
        `without finding an empty page. Increase MAX_PAGES if the repository genuinely has more open PRs.`
    );
  }

  return allPulls;
}

/** Convenience wrapper — fetches all open PRs. */
export async function fetchAllOpenPulls(
  request: APIRequestContext,
  repo: string
): Promise<GitHubPull[]> {
  return fetchAllPullRequests(request, repo, 'open');
}

// Adding closed PRs later is a one-liner:
// export const fetchAllClosedPulls = (r: APIRequestContext, repo: string) =>
//   fetchAllPullRequests(r, repo, 'closed');
