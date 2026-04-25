# Likes experience refresh — COPY-PASTA

Run commands from the **monorepo root** (`podverse` repo). Use `./scripts/nix/with-env` for `npm`/`npx` per [AGENTS.md](../../../../AGENTS.md).  
API and E2E may require **Postgres** and **Valkey**; see AGENTS and `make test_deps` (or your team’s workflow).

**Execution:** Phases are **sequential** (complete phase N before N+1) unless you intentionally parallelize per [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md).  
**Agent behavior:** Pasting a block below = instruction to read and implement that plan file, then run the listed verification (if any).

---

## CRITICAL: Execution rules

- **ONE phase at a time** in order **01 → 02 → 03 → 04 → 05 → 06 → 07 → 08** (unless 00-EXECUTION-ORDER allows a split).
- **Do not** mark the set “done” in `.llm` until [06 minimum](./06-tests-e2e-and-verification.md#minimum-must-have-before-phase-06-done) is satisfied and any 04 DTO/API blocker is explicitly **waived in PR notes**.

## Pre-flight checklist (before Phase 1)

- [ ] Confirm branch/PR scope is this plan set only (`likes-experience-refresh`).
- [ ] Confirm dependencies for tests (`make test_deps` or team equivalent) are up when running API/E2E.
- [ ] Confirm local test-assets strategy for media player tests (phase 07): use deterministic `localhost:2111` assets and avoid ad-hoc external media URLs.
- [ ] Confirm latest plan docs are read in this order: [00-SUMMARY](./00-SUMMARY.md) → [00-EXECUTION-ORDER](./00-EXECUTION-ORDER.md) → target phase.
- [ ] Confirm 02 auth handling default is understood: **Option A baseline**, Option B only where no row/menu wrapper exists.
- [ ] Confirm 04 may be deferred only with explicit PR waiver notes.

---

## Phase 1 — API and helpers (01)

```text
Read and implement .llm/plans/active/likes-experience-refresh/01-api-and-helpers-likes-summary.md
Align 01 with current repo: ORM getManyPrivate ordering for is_default_likes, GET /playlist/private/likes?include_resources=0, and PATCH contract (reconcile with any global “no medium on PATCH” behavior). Add or adjust apps/api tests in playlist.test.ts as specified.
No broad refactors outside the plan. Follow Podverse i18n, semicolons, and repo scripts via ./scripts/nix/with-env.
```

```bash
./scripts/nix/with-env npm run type-check -w packages/orm
./scripts/nix/with-env npm run type-check -w packages/helpers-requests
./scripts/nix/with-env npm run test -w apps/api
```

---

## Phase 2 — Web: More menu + batch + logged-out (02)

```text
Read and implement .llm/plans/active/likes-experience-refresh/02-web-more-menus-and-membership.md
Implement or complete batch hooks and More-menu likes on core and Add-by-RSS surfaces. Enforce: logged-out users see the like affordance everywhere; interaction opens the login modal; no membership or toggle API until signed in. Follow add-by-rss parity skill and styles-import-last.
```

```bash
./scripts/nix/with-env npx tsc --noEmit -p apps/web
./scripts/nix/with-env npm run lint -w apps/web
```

---

## Phase 3 — My Playlists (03)

```text
Read and implement .llm/plans/active/likes-experience-refresh/03-web-playlists-my-playlists-pinned.md
Rely on single server-ordered fetch for private playlists; default-likes first. Adjust PlaylistsFavorites/context only as the plan says.
```

```bash
./scripts/nix/with-env npx tsc --noEmit -p apps/web
./scripts/nix/with-env npm run lint -w apps/web
```

---

## Phase 4 — Media player: precedence + VTS heart (04)

```text
Read and implement .llm/plans/active/likes-experience-refresh/04-web-full-player-vts-heart.md
Unify full-size and mini player title/metadata resolution per precedence: VTS remote (in-system feed + link to item), then chapter toc:false over overlapping non-toc-false, then other chapters; ambiguous overlap uses first list position. Implement or wire getResolvedVtsLikeTargetItem when DTO/API allows; if blocked, document deferral in the plan file and add minimal unit tests for the resolver you can ship. Heart + logged-out behavior per 02.
```

```bash
./scripts/nix/with-env npx tsc --noEmit -p apps/web
./scripts/nix/with-env npm run lint -w apps/web
```

---

## Phase 5 — Playlist edit (05)

```text
Read and implement .llm/plans/active/likes-experience-refresh/05-web-playlist-edit-constraints.md
Reconcile with repo: is_default_likes and medium/playlist edit may already be stricter than the original text. Update only what still mismatches; keep PATCH aligned with server.
```

```bash
./scripts/nix/with-env npx tsc --noEmit -p apps/web
./scripts/nix/with-env npm run test -w apps/api
```

---

## Phase 6 — Tests and verification (06)

```text
Read and implement .llm/plans/active/likes-experience-refresh/06-tests-e2e-and-verification.md
Meet minimum test bar in 00-SUMMARY; add optional E2E only where the repo has Playwright coverage patterns. After meaningful UI change, use repo Makefile screenshot/report flow per .cursor rules (end-with-targeted-make-report-verify) when applicable.
```

```bash
./scripts/nix/with-env npm run test -w apps/api
# E2E when env ready, e.g. from repo Makefile targets your team uses for web
```

---

## Phase 7 — E2E media-player foundation (07)

```text
Read and implement .llm/plans/active/likes-experience-refresh/07-e2e-media-player-test-foundation.md
Create deterministic media-player E2E foundation: local media asset strategy, scenario seeding/spoofing for vts/toc:false/chapter/none, and reusable e2e helper modules for opening player, seeking, and overlay assertions.
```

```bash
make e2e_test_web_report_spec SPEC=apps/web/e2e/<foundation-spec>.spec.ts
```

---

## Phase 8 — E2E behavior matrix + screenshots (08)

```text
Read and implement .llm/plans/active/likes-experience-refresh/08-e2e-likes-and-player-overlay-matrix.md
Deliver final web E2E behavior proof with screenshot reports: logged-out like visibility/modal/no API pre-auth, and media-player hierarchy assertions for vts/toc:false/chapter/none + tie-break in full and mini info surfaces.
```

```bash
make e2e_test_web_report_spec SPEC=apps/web/e2e/likes-auth-and-more-menu.spec.ts
make e2e_test_web_report_spec SPEC=apps/web/e2e/media-player-overlay-hierarchy.spec.ts
```

---

## Reference (no new prompt)

- [00-SUMMARY.md](./00-SUMMARY.md) — **gaps, definition of done, what to tighten**
- [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md) — order and parallelization notes
- [00-master.md](./00-master.md) — product bullets and execution order

## Completion checklist (before moving to completed/)

- [ ] 01–06 phase files are updated with final outcomes and any deferrals.
- [ ] [06 minimum](./06-tests-e2e-and-verification.md#minimum-must-have-before-phase-06-done) is satisfied.
- [ ] Any 04 DTO/API blocker is clearly waived in PR notes (if unresolved).
- [ ] No open TODO remains in active plan files for this set.
- [ ] Archive move follows [plan-completion skill](../../../../.cursor/skills/plan-completion/SKILL.md).
