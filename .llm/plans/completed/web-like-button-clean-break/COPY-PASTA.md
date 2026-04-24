# COPY-PASTA

Use these prompts in sequence to execute the web like-button plan set one-by-one.
Run all commands from the monorepo root.
Follow [00-master-plan.md](./00-master-plan.md) for product decisions and hard phase gates.
Local E2E and API integration tests need Postgres and Valkey; see [AGENTS.md](../../../../AGENTS.md) (monorepo root) for ports and `make test_deps`.

## Phase 1

Status: Completed

### Plan 01 - Schema And Contract Rename To Likes

```text
Implement the plan in .llm/plans/active/web-like-button-clean-break/01-schema-and-contract-rename.md
Rename `is_default_favorites` to `is_default_likes` and favorites naming to likes across SQL, ORM, DTOs, API routes, and request helpers.
Preserve default-likes playlist uniqueness (one per account per medium).
Implement as clean-break only: no fallback code, no legacy comments, no compatibility branches.
```

```bash
./scripts/nix/with-env npm run test -w packages/orm
./scripts/nix/with-env npm run test -w packages/helpers
./scripts/nix/with-env npm run test -w packages/helpers-requests
```

## Phase 2

Status: Completed

### Plan 02 - API Likes Service And Toggle

```text
Implement the plan in .llm/plans/active/web-like-button-clean-break/02-api-likes-service-and-toggle.md
Likes are backed by `is_default_likes` playlist rows: one AV and one music per account. Clips and the
`My Likes` Clips tab are AV default-likes membership, filtered to clip resources (not a third medium
playlist). Add-by-rss is in-scope where playlist add-by-rss already exists.
Implement: private likes snapshot read (DTO rename), `POST` batch membership for list pages, a single
dedicated like/unlike toggle endpoint that also handles first-like provisioning, and dedicated `GET`
My Likes list endpoints for Episodes/Music/Clips tabs (server-side filtering, paginated). Toggles and
first-like provisioning must be idempotent and safe under concurrent requests.
Implement as clean-break only: no fallback code, no legacy comments, no compatibility branches.
```

```bash
./scripts/nix/with-env npm run test -w apps/api
./scripts/nix/with-env npm run lint -w apps/api
```

## Phase 3

Status: Completed

### Plan 03 - Web Like Button Rollout

```text
Implement the plan in .llm/plans/active/web-like-button-clean-break/03-web-like-button-rollout.md
Introduce a reusable LikeButton; implement a first-class likes provider; batch-hydrate filled state via
`POST` membership for large tables; use the server-side toggle for like/unlike (not raw playlist add
calls in UI). Place like controls to the left of the `more` menu trigger on likeable list/detail
rows (include Add-by-RSS parity surfaces); login-required modal when logged out. Do not add likes on
livestreams.
Implement as clean-break only: no fallback code, no legacy comments, no compatibility branches.
```

```bash
./scripts/nix/with-env npm run test -w apps/web
./scripts/nix/with-env npm run lint -w apps/web
```

## Phase 4

Status: Completed

### Plan 04 - Player And Value Time Split Likes

```text
Implement the plan in .llm/plans/active/web-like-button-clean-break/04-player-and-value-time-split-likes.md
Add parent like to mini- and full-size player; in full-size player, add a second split like control
positioned near VTS metadata, but only when the VTS can resolve a canonical `Item` id. If the split
cannot resolve, hide the split like control. Parent like remains. Broader VTS/overlay/Boost work is
explicitly not part of this phase; see 07-future-vts-boost-and-metadata.md for follow-up.
No like controls in livestream-only contexts.
Implement as clean-break only: no fallback code, no legacy comments, no compatibility branches.
```

```bash
./scripts/nix/with-env npm run test -w apps/web
./scripts/nix/with-env npm run lint -w apps/web
```

## Phase 5

Status: Completed

### Plan 05 - My Likes Page And Sidebar

```text
Implement the plan in .llm/plans/active/web-like-button-clean-break/05-my-likes-page-and-sidebar.md
Add My Likes in the sidebar, route, and a tabbed page: Episodes, Music Tracks, and Clips. Wire each
tab to the dedicated server-side `GET` my-likes list endpoint for that tab (not client-only
filtering). Keep default URLs clean (e.g. default tab has no `tab=`), following routing-url-params
rules: only persist non-default query params, never `page=1`, etc.
Implement as clean-break only: no fallback code, no legacy comments, no compatibility branches.
```

```bash
./scripts/nix/with-env npm run test -w apps/web
./scripts/nix/with-env npm run lint -w apps/web
```

## Phase 6

Status: Completed

### Plan 06 - Tests And Verification

```text
Implement the plan in .llm/plans/active/web-like-button-clean-break/06-tests-and-verification.md
Update and extend API integration tests for likes routes and toggles; add E2E coverage for row/detail/ player / My Likes and logged-out gating.
Playwright must be verified via make targets (not raw npx playwright); see .cursor/rules/e2e-run-with-make-only.mdc
Implement as clean-break only: no fallback code, no legacy comments, no compatibility branches.
```

```bash
./scripts/nix/with-env npm run test -w apps/api
./scripts/nix/with-env npm run test -w apps/web
./scripts/nix/with-env npm run test -w packages/orm
./scripts/nix/with-env npm run test -w packages/helpers
./scripts/nix/with-env npm run test -w packages/helpers-requests
./scripts/nix/with-env npm run lint
make test_deps
./scripts/nix/with-env npm run test:e2e:api
# Prefer scoped screenshot-report runs for like-button changes:
make e2e_test_web_report_spec SPEC=e2e/likes-list-detail.spec.ts
make e2e_test_web_report_spec SPEC=e2e/likes-player.spec.ts,e2e/my-likes.spec.ts
# Optional broader regression:
# make e2e_test_report
```

## Completion step

Status: Completed

When all plans are complete, move the set from `active` to `completed` following plan lifecycle rules:

```bash
mkdir -p .llm/plans/completed
mv .llm/plans/active/web-like-button-clean-break .llm/plans/completed/
```
