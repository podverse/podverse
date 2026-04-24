# Plan 06 - Tests And Verification

## Goal

Add required integration and E2E coverage for the likes implementation across API and web surfaces.

## Target Files

- `apps/api/src/test/playlist.test.ts`
- Additional API integration tests as needed under `apps/api/src/test/`
- `apps/web/e2e/` specs for likes flows
- Any shared test helpers touched by new likes routes and UI flows

## Steps

1. Update API integration tests from favorites to likes naming and route contracts.
2. Add API tests for:
   - `POST` membership batch: caps, correct booleans, and no query-string bloat
   - dedicated likes toggle: items (AV+music), clips, add-by-rss, and the **first like creates defaults**
   - concurrent first-like / toggle idempotence (at least a focused test proving no duplicate default
     playlists for the same account+medium)
   - dedicated per-tab `GET` my-likes list endpoints: type filtering, pagination, and `clips` sourced from
     AV default-likes membership
3. Add E2E tests for:
   - list-row/detail like button placement and toggle behavior
   - add-by-rss like parity (at least one representative add-by-rss list/detail surface)
   - logged-out like click showing login-required modal
   - mini-player and full-size player like controls
   - VTS: split like is shown only when resolvable; hidden when not; parent like still works
   - `My Likes` page tabs and displayed resource correctness
4. Run targeted test commands and collect verification artifacts.

## Acceptance Criteria

- Integration tests pass for likes contracts and toggles.
- E2E tests pass for web likes UX, auth gating, player interactions, and My Likes tabs.
- No regressions in existing playlist behavior for non-like workflows.
