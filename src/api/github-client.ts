// Responsibility: fetch all open pull requests from the GitHub REST API.
// Handles HTTP requests and pagination only — no assertions, no business rules.
//
// Pagination strategy:
//   GitHub returns up to 100 items per page. We loop through pages starting at 1
//   and stop when a page comes back empty (no more results). We do not rely on the
//   Link header because checking for an empty page is simpler and equally correct.

import type { APIRequestContext } from '@playwright/test';
import type { GitHubPull } from '../types/github.types';

const GITHUB_API_BASE = 'https://api.github.com';
const PAGE_SIZE = 100; // GitHub's maximum items per page

/**
 * Fetches every open pull request for the given repository.
 *
 * @param request - Playwright's APIRequestContext, injected by the test fixture.
 *                  It carries the Authorization and Accept headers configured
 *                  in playwright.config.ts so we do not repeat them here.
 * @param repo    - Repository in "owner/name" format, e.g. "appwrite/appwrite".
 * @returns       - Flat array of all PR objects across all pages.
 */
export async function fetchAllOpenPulls(
  request: APIRequestContext,
  repo: string
): Promise<GitHubPull[]> {
  const allPulls: GitHubPull[] = [];
  let currentPage = 1;

  while (true) {
    const response = await request.get(`${GITHUB_API_BASE}/repos/${repo}/pulls`, {
      params: {
        state: 'open',
        per_page: String(PAGE_SIZE),
        page: String(currentPage),
      },
    });

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `GitHub API request failed — status ${response.status()} on page ${currentPage}. ` +
          `Body: ${body}`
      );
    }

    const pageItems: GitHubPull[] = await response.json();

    // An empty page means we have retrieved all available pull requests
    if (pageItems.length === 0) {
      break;
    }

    allPulls.push(...pageItems);
    currentPage += 1;
  }

  return allPulls;
}
