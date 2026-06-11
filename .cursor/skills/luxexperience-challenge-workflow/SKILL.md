---
name: luxexperience-challenge-workflow
description: Guides implementation of the LuxExperience Senior QA Backend technical challenge — GitHub PR pagination, Zod schemas, domain rules, Vitest tests, and README. Use when building Part 1 or Part 2, scaffolding modules, or asking what to implement next.
disable-model-invocation: true
---

# LuxExperience challenge workflow

## Read first

1. `../interviews/targets/luxexperience-senior-qa-backend/technical-challenge.md`
2. `../interviews/targets/luxexperience-senior-qa-backend/assessment-plan.md`
3. `AGENTS.md` in this workspace

## Implementation order

Only begin when the user asks to implement. If the repo is still empty, scaffold first per `assessment-plan.md` (`npm init`, TypeScript, Vitest, Zod, folder layout).

```
Task progress:
- [ ] Scaffold repo (when user asks)
- [ ] Part 2 unit path (fast feedback, no network)
- [ ] Part 1 GitHub client + pagination
- [ ] Part 1 integration test
- [ ] README + optional CI workflow
- [ ] Submission readiness review (see submission-readiness skill)
```

## Part 2 — Middleware payload (mocked)

1. Add `src/fixtures/middleware-sample.json` (committed sample from challenge).
2. `src/schemas/middleware-payload.schema.ts` — Zod structure.
3. `src/domain/middleware-rules.ts`:
   - `assertCountIntegrity` — `pull_requests.length === total_open_prs`
   - `assertHighPriorityNotDraft` — `high-priority` label ⇒ `meta.is_draft === false`
4. `tests/unit/middleware-payload.test.ts`:
   - Happy path on sample fixture
   - Negative: draft + high-priority → explicit error message

## Part 1 — GitHub open PRs (live)

1. `src/schemas/github-pull.schema.ts` — validate each PR item.
2. `src/api/github-client.ts` — `fetchAllOpenPulls(repo)` with `per_page=100`, page loop until empty or no `rel="next"`.
3. `src/domain/open-pr-rules.ts` — count where `state === 'open'` and `draft !== true`.
4. `tests/integration/github-open-prs.test.ts`:
   - Fetch all pages
   - Validate schema per item
   - Assert eligible count matches filtered length
   - On failure, log `id`, `state`, `draft` for CI

## Pagination notes

- Query: `state=open` on `https://api.github.com/repos/appwrite/appwrite/pulls`
- Parse `Link` header for `rel="next"` or stop on empty page
- Document unauthenticated rate limit (60/hr); optional `GITHUB_TOKEN` in CI

## Senior QE touches (if time permits)

- `.github/workflows/ci.yml` running `npm test` on push
- `.env.example` with `GITHUB_TOKEN=` commented
- Retry or skip integration test when `GITHUB_TOKEN` missing (document behavior)
