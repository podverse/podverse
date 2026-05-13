# Execution order

Each step is its own commit on `refactor/media-player`. CI must stay
green at every commit. Sub-step files keep each commit reviewable; do
not collapse them into one PR.

| #   | Step                                                           | File                                                                                                | Branch op                              |
| --- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | Behavior baseline and test harness                             | [`01-behavior-baseline-and-test-harness.md`](./01-behavior-baseline-and-test-harness.md)            | start `refactor/media-player`          |
| 2   | Playback domain types and helpers                              | [`02-playback-domain-types.md`](./02-playback-domain-types.md)                                      | continue `refactor/media-player`       |
| 3a  | Load policy + new MediaPlayer context shape (no consumers yet) | [`03a-policy-design-and-context-shape.md`](./03a-policy-design-and-context-shape.md)                | continue                               |
| 3b  | Migrate every load-policy consumer; delete superseded helpers  | [`03b-consumer-migration.md`](./03b-consumer-migration.md)                                          | continue                               |
| 4a  | Bridge API + controls context + unified element contract       | [`04a-bridge-api-and-element-architecture.md`](./04a-bridge-api-and-element-architecture.md)        | continue                               |
| 4b  | Unified `<MediaElement>` for regular audio + video             | [`04b-unified-media-element-regular-av.md`](./04b-unified-media-element-regular-av.md)              | continue                               |
| 4c  | Migrate every UI consumer; remove `MEDIA_PLAYER` event group   | [`04c-consumer-migration-and-bus-removal.md`](./04c-consumer-migration-and-bus-removal.md)          | continue                               |
| 5   | Controller slim-down + ESLint guards                           | [`05-controller-slim-down.md`](./05-controller-slim-down.md)                                        | continue                               |
| 6   | Skill docs, AGENTS update, merge                               | [`06-skill-docs-and-merge.md`](./06-skill-docs-and-merge.md)                                        | merge `refactor/media-player → develop` |

## Why this ordering

- **1 → 2:** Behavior must be captured before any architectural shift.
  Phase 1 produces both the human-readable matrix and the executable
  E2E specs that gate every later commit. Phase 2 is type-only — no
  runtime risk.
- **2 → 3a → 3b:** The load-policy work is decoupled from the bridge
  work. Doing it first means the (still-legacy)
  `MediaPlayerControllerAV` already speaks the new
  `PlaybackLoadRequest` vocabulary by the time we tear into the media
  element wiring. 3a designs and ships the new context shape +
  `resolvePlaybackLoadDecision` without flipping any consumers; 3b is
  the migration commit that flips them and deletes the superseded
  helpers.
- **3 → 4a → 4b → 4c:** The bridge work is split three ways so each
  commit ships one architectural change with bounded blast radius:
  - **4a** designs and ships the bridge hook,
    `MediaPlayerControlsContext`, and the unified `<MediaElement>`
    contract — without removing any legacy controller. The regular
    audio + video controllers use the bridge; **livestream**
    controllers keep their existing video.js wiring (not bridged in
    this plan-set).
  - **4b** collapses the regular audio + regular video paths into the
    single `<MediaElement>`. Live streams still go through their own
    legacy controller; folding them into `<MediaElement>` is the
    separate
    [`media-player-livestream-hls-migration`](../media-player-livestream-hls-migration/)
    plan-set.
  - **4c** is the UI sweep: every button/slider/transcript/keyboard
    consumer of `EVENTS.MEDIA_PLAYER` switches to
    `useMediaPlayerControls()`. The `MEDIA_PLAYER` event group is
    deleted. Keyboard handler is **last** because it's the most
    cross-cutting consumer and benefits from every other consumer
    being migrated first.
- **5:** With the load decision externalized (step 3) and the imperative
  shell extracted (step 4), the controller has nothing left to do but
  watch its data inputs. Slim-down is now mechanical. ESLint guards
  prevent regression (bridge-only `mediaRef` writes; **no** `video.js`
  import ban — that ships with the HLS follow-up plan-set).
- **6:** Documentation and merge are last so the captured shape is the
  one that actually shipped.

## Branch lifecycle

- **Open:** start of step 1.
- **Rebase cadence:** weekly against `develop`. The Phase 1 E2E specs
  serve as the rebase smoke test — if they fail, fix before continuing.
- **Step granularity:** each numbered step (including 3a/3b/4a–4c) is
  one commit (or a small series), one CI run, one merge to the refactor
  branch.
- **Close:** end of step 6, after the squash-or-merge to `develop`.

## Estimated effort (rough; for sequencing, not scheduling)

- 1: 1.5–2 days (writing the matrix is the slow part).
- 2: 0.5 day (types only).
- 3a: 1 day; 3b: 1.5 days.
- 4a: 1 day; 4b: 1 day; 4c: 1 day.
- 5: 0.5–1 day.
- 6: 0.5 day (docs + merge).

Plan ~8.5–9 working days of focused effort across the lifetime of the
branch. Calendar time will be longer if interleaved with other work.

**After merge:** execute the follow-up
[`media-player-livestream-hls-migration`](../media-player-livestream-hls-migration/)
plan-set (expand it first; it is placeholder-level today).

## Verification at each step

Each sub-file has its own "verification" section at the bottom. The
floor is:

- `npm run lint`
- `npm run test:unit`
- `make e2e_test_web_report` (Phase 1 baseline must stay green; later
  phases can also run scoped specs).

## Final smoke (before merging step 6)

- `npm run lint`
- `npm run test:unit`
- `make e2e_test_web_report` (full report; visually compare a sample of
  step screenshots to the Phase 1 baseline).
- `make e2e_test_management_web_report` (sanity; the refactor doesn't
  touch management-web but rebases pick up other people's changes).
- `npm run build:packages` and `npm run build -w apps/web` to confirm
  the production bundle is clean.
