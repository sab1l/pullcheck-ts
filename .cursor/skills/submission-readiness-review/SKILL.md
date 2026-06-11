---
name: submission-readiness-review
description: Pre-submission checklist for the LuxExperience technical challenge — README completeness, test coverage, secrets scan, fresh-clone run, and reviewer-facing polish. Use before pushing to GitHub or replying to the recruiter.
disable-model-invocation: true
---

# Submission readiness review

Run this checklist before sending the repo link.

## Requirements traceability

- [ ] Part 1: fetches **all** open PRs (full pagination), validates schema, counts OPEN non-draft only
- [ ] Part 2: integrity rule + high-priority/draft rule with **clear error message** on violation
- [ ] TypeScript; api / domain / tests separated
- [ ] Useful failure output for CI

## Code and tests

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes locally
- [ ] Part 2 has happy path + at least one negative case
- [ ] No business logic duplicated in test files
- [ ] No `.env`, tokens, or credentials in git history

## README

- [ ] Architectural decisions and assumptions
- [ ] Pagination approach documented
- [ ] Validation approach (schema vs business rules)
- [ ] How to run from fresh clone
- [ ] Optional: CI badge or workflow note
- [ ] Out of scope / more time section

## Fresh-machine simulation

```bash
cd /tmp && git clone <your-repo-url> lux-test && cd lux-test
npm ci && npm test && npm run typecheck
```

## Submission package

- [ ] Public repo URL ready (suggested name: `luxexperience-pr-monitor-tests`)
- [ ] Update `../interviews/targets/luxexperience-senior-qa-backend/README.md` with repo link and submit date
- [ ] Reply email: short note + link + any CI/token setup one-liner

## Reviewer skim test

Can someone understand the design in **3 minutes** from README + folder tree alone? If not, tighten README first.
