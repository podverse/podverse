# Execution order

Each step is its own commit on `feat/media-player-e2e-seeds`. CI must
stay green at every commit. Sub-step files keep each commit reviewable;
do not collapse them into one PR.

| #   | Step                                            | File                                                                  | Branch op                            |
| --- | ----------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------ |
| 1   | Seed extension design + id constants            | [`01-seed-extension-design.md`](./01-seed-extension-design.md)        | start `feat/media-player-e2e-seeds`  |
| 1b  | Test audio fixtures + asset-server wiring       | [`01b-test-audio-fixtures-and-asset-server.md`](./01b-test-audio-fixtures-and-asset-server.md) | continue           |
| 2   | Podcast item fixtures (clip, soundbite, chapter, resume) | [`02-podcast-item-fixtures.md`](./02-podcast-item-fixtures.md) | continue                             |
| 3   | Music album fixture                             | [`03-music-album-fixture.md`](./03-music-album-fixture.md)            | continue                             |
| 4   | Add-by-RSS fixture                              | [`04-add-by-rss-fixture.md`](./04-add-by-rss-fixture.md)              | continue                             |
| 5   | Anonymous snapshot wiring                       | [`05-anonymous-snapshot.md`](./05-anonymous-snapshot.md)              | continue                             |
| 6   | Matrix cleanup + verification + merge           | [`06-verification-and-merge.md`](./06-verification-and-merge.md)      | merge `feat/media-player-e2e-seeds → develop` |

## Why this ordering

- **1 → 1b:** Step 1 produces every deterministic id_text and helper
  constant the later specs import. Step 1b lands the matching audio
  fixtures and Playwright/asset-server wiring those constants point
  at. Splitting 1 from 1b keeps each commit reviewable: 1 is text-
  only, 1b is binary fixtures + tooling.
- **1b → 2:** Steps 2-4 INSERT `enclosure_url` values that resolve to
  the fixtures pinned by 1b. Without 1b first, the seeded items would
  point at unreachable hosts and the lifted specs could not fire real
  `loadedmetadata` / `timeupdate` / `ended` events.
- **2 → 3 → 4:** Podcast fixtures are the largest single seed addition
  and unblock the three highest-density specs (clip/soundbite,
  chapter, podcast resume). Music and add-by-RSS are independent
  smaller seeds; ordering by size keeps the first reviewable commit
  the broadest one.
- **3 / 4 → 5:** Anonymous snapshot reuses the podcast + music item
  id_text constants from steps 2 and 3 inside `page.addInitScript`. It
  comes last because it has no DB seed of its own — only a Playwright
  helper.
- **5 → 6:** Matrix cleanup and full-suite verification are last so
  the captured state reflects what shipped.

## Gating with the architecture refactor

This plan-set is a **prerequisite for Phase 3b** of the
[media-player-architecture-refactor](../../active/media-player-architecture-refactor/).
Phase 3b's `00-EXECUTION-ORDER.md` includes a `3b-gate` row pointing
back here. Phases 1, 2, and 3a of the refactor are skip-safe and may
land before, during, or after this plan-set.

There is no dependency in the other direction; this plan-set does not
import anything from the refactor branch. If the refactor branch is
ahead and has already shipped pieces of the new `lib/playback`
module, the specs continue to pass against the legacy behavior
because page-level assertions are framed in matrix terms (observed
`currentTime`, `mpIsPlaying`, side effects) rather than implementation
internals.

## Branch lifecycle

- **Open:** start of step 1.
- **Rebase cadence:** weekly against `develop`. The seven Phase 1
  active specs (foundation, keyboard shortcuts, space shortcut,
  overlay hierarchy, livestream header image, livestream audio start,
  plus any others active on `develop`) serve as the rebase smoke
  test — if they fail, fix before continuing.
- **Step granularity:** each numbered step (1–6) is one commit (or a
  small series), one CI run, one push to the seed branch.
- **Close:** end of step 6, after the squash-or-merge to `develop`.

## Estimated effort (rough; for sequencing, not scheduling)

- 1: 0.5 day (constants + helper file + table inventory writeup).
- 1b: 0.5 day (generator script + commit six fixtures + asset-server
  webServer entry + gitignore exception).
- 2: 1–1.5 days (largest seed; three specs to lift).
- 3: 0.5–1 day (music album + tracks + queue rows; one spec to lift).
- 4: 0.5 day (two add-by-RSS rows; one spec to lift; verify existing
  encryption env).
- 5: 0.5 day (helper + spec lift; no DB work).
- 6: 0.5 day (matrix edit + full E2E run + merge).

Total ~4–5 working days of focused effort across the lifetime of
the branch. Calendar time will be longer if interleaved with other
work.

**After merge:** archive per
[plan-completion](../../../.cursor/skills/plan-completion/SKILL.md):

```bash
mv .llm/plans/active/media-player-e2e-seed-expansion \
   .llm/plans/completed/media-player-e2e-seed-expansion
```

## Verification at each step

Each sub-file has its own "verification" section at the bottom. The
floor is:

- `make e2e_seed_web` succeeds and is idempotent (run twice).
- `make e2e_test_web_report_spec SPEC=<spec-path>` for each lifted
  spec on the commit that lifts it.

## Final smoke (before merging step 6)

- `make e2e_test_report` (full report; confirms the six newly
  active web specs pass, the seven previously active web specs
  still pass, and the management-web report — which this plan-set
  does not touch — still passes against any concurrent rebases).
- `npm run lint -w apps/web` (helpers under `apps/web/e2e/helpers/`
  are linted).
- Visually scan a sample of the new step screenshots and compare
  against the matrix cells they cover.
