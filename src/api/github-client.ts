/*
 * Responsibility: fetch all open pull requests from the GitHub REST API.
 * Handles HTTP requests and pagination only — no assertions, no business rules.
 *
 * Pagination strategy:
 *   GitHub returns up to 100 items per page. We loop through pages starting at 1
 *   and stop when a page comes back empty (no more results). We do not rely on the
 *   Link header because checking for an empty page is simpler and equally correct.
 *
 * Memory footprint options (for reference — current implementation uses a flat array):
 *   A) Flat array (current): accumulate all items, return once complete.
 *      Simple to use; peak memory = total PR count × item size (~1-2 KB each).
 *      For this challenge: 442 PRs × ~2 KB = ~900 KB — negligible.
 *   B) Async generator (yield one page at a time): caller receives each page as
 *      it arrives and can discard it before the next page is fetched.
 *      Lower peak memory; changes the function signature (requires for-await-of).
 *   C) Per-page callback: caller provides a function invoked for each page; zero
 *      accumulation; most memory-efficient; least reusable for callers that need
 *      the full list (e.g. schema validation across all items at once).
 *   Decision: flat array is the right trade-off here — the dataset is small and
 *   the full list is needed for complete schema validation in the test.
 */

import type { APIRequestContext } from '@playwright/test';
import type { GitHubPull } from '@app-types/github.types';
import { GITHUB_API_BASE } from '@config';

const PAGE_SIZE = 100; // GitHub's maximum items per page

/*
 * Hard limit on the number of pages to fetch.
 *
 * Options for a page-loop guard:
 *   A) Constant upper bound (chosen): simple, zero config, throws clearly if exceeded.
 *      Trade-off: any repo with more than MAX_PAGES × PAGE_SIZE open PRs will error.
 *      At 50 pages × 100 items = 5000 PRs, this is far beyond any real-world repo.
 *   B) Configurable parameter with a default: caller controls the limit at call site.
 *      Trade-off: more flexible but adds API surface and requires callers to think
 *      about the value.
 *   C) Parse the Link response header rel="last" to know the page count upfront.
 *      Trade-off: more accurate and avoids the empty-page terminator request, but
 *      requires header string parsing and an upfront request before the loop.
 */
const MAX_PAGES = 50;

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

  while (currentPage <= MAX_PAGES) {
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

  if (currentPage > MAX_PAGES) {
    throw new Error(
      `Pagination safety limit reached: fetched ${MAX_PAGES} pages (${MAX_PAGES * PAGE_SIZE} PRs) ` +
        `without finding an empty page. Increase MAX_PAGES if the repository genuinely has more open PRs.`
    );
  }

  return allPulls;
}
