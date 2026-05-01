# 06 — Tests and verification (baseline gate before 07/08)

## Minimum (must have before “phase 06 done”)

Non-optional items the implementer or reviewer confirms:

- **API ([playlist.test.ts](../../../apps/api/src/test/playlist.test.ts)):**  
  - [x] `GET /playlist/private/likes?include_resources=0` still asserts the service is called in the **omit resources** path (or equivalent, if test layout changes).  
  - [x] `PATCH` request body in tests **does not** include `medium` and still matches **200** success path with mocks.  
- **Typecheck + lint (scoped):** per phase in [COPY-PASTA](./COPY-PASTA.md).  
- **Screenshot / report:** if UI changed, follow [end-with-targeted-make-report-verify](../../../../.cursor/rules/end-with-targeted-make-report-verify.mdc) and repo Makefile (run from monorepo root, `./scripts/nix/with-env` for tools).
- **Handoff to advanced E2E:** after 06 baseline passes, continue with [07](./07-e2e-media-player-test-foundation.md) and [08](./08-e2e-likes-and-player-overlay-matrix.md) for final media-player hierarchy + likes/auth screenshot coverage.

## Completion

- Status: completed
- Baseline gate satisfied; 07 and 08 completed with scoped report specs.

## Stretch (optional / product QA)

- **Web unit:** `PlaylistForm` or playlist edit, if a matching test file exists.  
- **04:** unit tests for shared title/chapter resolution helper — VTS+feed, `toc: false` over overlap, first-position tie-break.  
- **E2E (Playwright):** default-likes row order on playlists when seed data exists; **logged-out** like visible + login path + no pre-auth likes API (if e2e env supports it).  
- **Full locale pass:** if policy requires, all [i18n](.cursor/rules/i18n-management.mdc) originals+overrides; otherwise **en-US** at minimum and note deferral in PR.

## Waiver

If a minimum item is impossible in CI (e.g. no DB in a job), document **waiver in PR** and a **local** run command, or promote the test to a job that has `test_deps`.
