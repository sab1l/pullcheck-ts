# pullcheck-ts

Automated PR monitoring test suite — schema validation and business rule checks for pull request data.

## Problem interpretation

The challenge asks for a test suite that monitors pull requests from two angles:

- **Part 1 (live API):** Fetch all open PRs from `appwrite/appwrite` via the GitHub REST API, validate their structure, and count only the ones that are eligible — open state and not a draft.
- **Part 2 (mocked middleware):** Validate a JSON payload produced by a middleware aggregator against structural and business rules, including a case that must be detected and clearly reported as a failure.

The goal is a suite that is **maintainable and reusable**: swap the repository name or the payload source and the rules continue to work unchanged.

---

## Architecture

The codebase is split into four layers. Each layer has one job and must not reach into the responsibilities of another.

```
src/
├── types/      TypeScript interfaces — data shape contracts, no runtime logic
├── schemas/    Zod schemas — runtime structural validation, no business rules
├── domain/     Pure functions — business rules, no HTTP calls
└── api/        HTTP client — fetch + pagination, no assertions

tests/
├── unit/       Domain and schema tests — no network, fixture-driven
└── integration/ End-to-end test — live GitHub API
```

Data flow for Part 1:

```
Playwright request fixture
        │
        ▼
src/api/github-client.ts    ← fetches pages, returns GitHubPull[]
        │
        ▼
src/schemas/github-pull.schema.ts   ← validates shape of each item
        │
        ▼
src/domain/open-pr-rules.ts         ← filters eligible PRs, returns count
        │
        ▼
tests/integration/github-open-prs.test.ts   ← asserts, logs summary
```

---

## Pagination

GitHub's REST API returns pull requests one page at a time (up to 100 items per page). The client in `src/api/github-client.ts` uses a simple page-increment loop:

1. Start at `page=1` with `per_page=100` and `state=open`.
2. If the page returns items, append them and increment the page counter.
3. If the page is empty, stop — all available PRs have been retrieved.

This approach does not rely on the `Link` response header (which requires string parsing) and is easier to read and explain. The trade-off is one extra HTTP request at the end of every run (the empty page that terminates the loop), which is acceptable given the rate limits.

---

## Validation approach

Validation is split into two distinct responsibilities:

| Layer | What it validates | What it does not do |
|-------|-------------------|---------------------|
| `src/schemas/` (Zod) | Field types, required fields, URL format, non-negative integers | Counting, label rules, draft logic |
| `src/domain/` (pure functions) | Business rules (count integrity, high-priority/draft conflict) | Field types, HTTP |

This split means a schema change (e.g. GitHub renames a field) and a business rule change (e.g. a new label rule) are isolated from each other and can be reviewed, tested, and changed independently.

The Zod schemas are tied to the TypeScript interfaces via a compile-time assignability check, so structural drift between the two is caught at `npm run typecheck` time — no runtime surprise.

---

## Assumptions

- **`draft` field:** The GitHub API field `draft: boolean` is the authoritative source for draft status. This field has been stable since GitHub introduced draft PRs in 2019.
- **`state=open` on the API request:** We pass `state=open` to reduce the payload. We then re-check `state === 'open'` inside the domain filter as a defensive measure against unexpected items.
- **Rate limits:** Unauthenticated requests are capped at 60/hr. The integration test makes roughly `ceil(total_open_prs / 100) + 1` requests per run, so well within that limit for a single CI job. Setting `GITHUB_TOKEN` raises the cap to 5000/hr.
- **Middleware payload:** The `last_updated` field is validated as a string. Parsing it as a date is out of scope — it was not part of the validation conditions in the challenge.
- **Part 2 is synchronous / pure:** The middleware payload is treated as a committed fixture. No mocking library is needed because the domain functions are plain TypeScript with no dependencies.

---

## How to run

```bash
# Install dependencies
npm install

# Install the Playwright browser used for the test runner
npx playwright install chromium

# Run all tests (unit + integration)
npm test

# Run unit tests only (no network required)
npm run test:unit

# Run integration tests only (requires internet access)
npm run test:int

# Type-check without running tests
npm run typecheck
```

To avoid GitHub rate limits, set a personal access token:

```bash
GITHUB_TOKEN=ghp_yourtoken npm run test:int
```

---

## What is automated vs. manual

| Area | Automated | Rationale |
|------|-----------|-----------|
| GitHub API structural validation (shape, types) | Yes | Catches silent regressions in the API response format |
| Open/non-draft PR count | Yes | Core requirement; deterministic given the data |
| Middleware payload schema check | Yes | Catches malformed payloads from the aggregator |
| Business rules (count integrity, high-priority/draft) | Yes | Rules are well-defined and have clear pass/fail conditions |
| Visual or UI PR review workflows | Manual | Out of scope — no browser interaction required |
| Rate-limit retry logic | Manual / not implemented | See "with more time" below |

---

## With more time

- **Retry on rate limit:** Detect `HTTP 429` or `HTTP 403` with `X-RateLimit-Remaining: 0` and wait until `X-RateLimit-Reset` before retrying.
- **Recorded fixtures for integration tests:** Use `playwright` request interception or a tool like `nock` to record real API responses once and replay them in CI. This removes the network dependency and makes the integration tests deterministic.
- **Shared npm package:** The `src/domain/` functions and `src/schemas/` are self-contained and have no runtime dependencies beyond Zod. They could be extracted into a versioned package for reuse across multiple product test suites.
- **More negative schema tests:** Cover additional edge cases — empty `pull_requests` array, `null` values in optional fields, extra fields that should be ignored.
