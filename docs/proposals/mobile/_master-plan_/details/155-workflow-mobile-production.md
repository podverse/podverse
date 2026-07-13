# 155-workflow-mobile-production

**Master step:** 4.6
**Model (author + implement):** Opus 4.8
**Status:** ready

## Scope

- Create `.github/workflows/mobile-production-submit.yml` on `main` with **manual approval** /
  `environment: production-mobile` (or `workflow_dispatch` + required reviewers).
- Submit already-built beta binary when possible; never auto-promote without human gate.
- Store safety: only `com.podverse.app.next` — never prod listing.

## Architecture notes

- Server promote is retag; mobile cannot retag — submit is explicit.
- Prefer promoting the exact TestFlight/Play build that was QA'd (store-supported).

## Acceptance criteria

- Manual gate required before submit
- Bundle id / applicationId remain `.next`
- Isolated from publish-main

## Web parity references

- [STAGING-MAIN-PROMOTION.md](/docs/development/release/STAGING-MAIN-PROMOTION.md) (contrast)
- [DOCS-MOBILE-VERSIONING-RELEASE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md)

## Verification

```bash
test -f .github/workflows/mobile-production-submit.yml
rg -n 'environment|workflow_dispatch|approval|submit' .github/workflows/mobile-production-submit.yml
```
