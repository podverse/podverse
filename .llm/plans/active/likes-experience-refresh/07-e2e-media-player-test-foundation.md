# 07 — E2E media-player test foundation (deterministic local)

Purpose: make media-player E2E tests reliable enough to validate overlay hierarchy and like behavior repeatedly on local and CI.

## Key decisions

- **Yes, use real local media URLs** for consistency (`http://localhost:2111/...`) via the existing test-assets tooling and Docker routing documented in [TOOLS-TEST-ASSETS.md](../../../tools/test-assets/TOOLS-TEST-ASSETS.md).
- **Do not rely on wall-clock playback** for assertions. In E2E, drive player position deterministically via `window.dispatchEvent(new CustomEvent('media_player_seek', { detail: { time } }))` and assert UI after each seek.
- Keep E2E orchestration on **make** targets only (per repo rules): `make e2e_test_web_report_spec SPEC=...`.

## Why this foundation is needed

- Current `tools/web/seed-e2e.mjs` seeds only account/auth basics; it does not provide dedicated media-player scenario data.
- Phase 04 requires assertions for hierarchy states:
  1) VTS remote match,
  2) chapter `toc: false`,
  3) chapter normal,
  4) none.
- Without deterministic setup + helpers, these tests will be flaky and hard to maintain.

## Data/setup plan (deterministic)

### A. Seed strategy

- Add a dedicated seed path for player scenarios (preferred):
  - New script (proposed): `tools/web/seed-e2e-media-player.mjs` (or extend existing `seed-e2e.mjs` with an opt-in flag).
  - Seed one test account + one channel + deterministic items that map to the four hierarchy states.
  - Use enclosure URLs from test-assets (`audio-001.mp3`, etc.) so media elements can load with no external network.

- Fallback if direct DB seeding for needed structures is too brittle:
  - Maintain **static** fixture RSS files under test-assets and parse them in setup.
  - Avoid interactive prompts (`--add-fake-value-tags` currently prompts); either use pre-generated fixture files committed in repo or add a non-interactive path for CI.

### B. Scenario fixture matrix

- Create fixture IDs/slugs for four item scenarios (suggested naming):
  - `mp-scenario-vts`
  - `mp-scenario-chapter-toc-false`
  - `mp-scenario-chapter-normal`
  - `mp-scenario-none`
- Also add one overlap fixture where two candidates collide and first-position tie-break is expected.

## Reusable E2E helper plan

Create reusable helpers under `apps/web/e2e/helpers/` so future media-player tests reuse setup:

- `mediaPlayerHarness.ts`
  - `openItemAndStartPlayback(...)`
  - `seekToSeconds(page, seconds)` (dispatch `media_player_seek`)
  - `openFullPlayerInfoModal(...)`
  - `getMiniPlayerInfoLocators(...)`
- `mediaPlayerAssertions.ts`
  - `expectOverlayState(page, 'vts' | 'tocFalse' | 'chapter' | 'none')`
  - `expectInfoLinkTargetsItem(page, expectedItemPath)`
  - `expectLikeAffordanceVisibleWhenLoggedOut(page)`
- `networkGuards.ts` (optional)
  - assert no `/playlist/private/likes/*` toggle/membership calls when logged out.

Keep helper names descriptive and sentence-style test steps per e2e readability rules.

## Reliability controls

- Run all E2E through make targets that seed + start dependencies:
  - `make e2e_test_web_report_spec SPEC=apps/web/e2e/<spec>.spec.ts`
- Use deterministic seed IDs and avoid depending on random sort/clock.
- Do not “fix” instability by raising timeouts first; verify destination page and target element visibility after every navigation and seek.

## Deliverables (07)

- [ ] Deterministic media-player scenario seed strategy documented and implemented (script(s) + README notes if needed)
- [ ] Reusable E2E helper modules for player actions/assertions
- [ ] One smoke-style validation spec that confirms helper flow can start player, seek, and read info sections without flake

## Exit criteria

- A developer can run one scoped spec locally with `make e2e_test_web_report_spec ...` and get stable screenshot-rich output for at least one player scenario.
