# Step 1 — Seed extension design and id constants

## Goal

Establish every deterministic identifier and helper-module shape the
later steps depend on, **without** inserting any new DB rows yet. This
commit is a small, low-risk pre-flight that makes each subsequent
step pure inserts + spec lifts.

## Scope

- New file: `apps/web/e2e/helpers/seedConstants.ts`. Exports the
  id_text constants every later spec imports.
- Annotation comments in [`tools/web/seed-e2e.mjs`](../../../tools/web/seed-e2e.mjs)
  (no new inserts in this commit) noting where steps 2–4 will add
  their `INSERT` blocks, mirroring the existing `E2E_LIVESTREAM_*`
  section.

## Deliverables

### 1. `apps/web/e2e/helpers/seedConstants.ts`

A single source of truth for E2E id_text values the new specs import.
Mirrors the existing pattern from
[`apps/web/e2e/helpers/setPasswordInvite.ts`](../../../apps/web/e2e/helpers/setPasswordInvite.ts).

Contents (final values chosen during this commit; placeholders below
indicate the shape only):

```typescript
/**
 * Deterministic ids for media-player E2E seeds. Must stay in sync with
 * `tools/web/seed-e2e.mjs`. Each constant is a 15-char hex id_text
 * unless documented otherwise.
 */

export const E2E_PODCAST_CHANNEL_ID_TEXT = 'e2ePodChnl001';

export const E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT = 'e2ePodResume01';
export const E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT = 'e2ePodResume02';
export const E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT = 'e2ePodResume03';
export const E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT = 'e2ePodChap0001';

export const E2E_CLIP_ID_TEXT = 'e2eClip00000001';
export const E2E_SOUNDBITE_ID_TEXT = 'e2eSoundbite001';

export const E2E_MUSIC_CHANNEL_ID_TEXT = 'e2eMusicChnl01';
export const E2E_MUSIC_ALBUM_ID_TEXT = 'e2eMusicAlbm01';
export const E2E_MUSIC_TRACK_ONE_ID_TEXT = 'e2eMusicTrk001';
export const E2E_MUSIC_TRACK_TWO_ID_TEXT = 'e2eMusicTrk002';

export const E2E_ADD_BY_RSS_FEED_URL =
  'https://e2e-seed-addbyrss.example/podcast.xml';
export const E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_ID_TEXT =
  'e2eAbRsResW01';
export const E2E_ADD_BY_RSS_RESOURCE_FRESH_ID_TEXT = 'e2eAbRsResF01';

/**
 * Anonymous snapshot ids are stable but the snapshot itself is
 * written via page.addInitScript — see
 * `apps/web/e2e/helpers/anonymousSnapshot.ts` (added in step 5).
 */
export const E2E_ANON_SNAPSHOT_PODCAST_ITEM_ID_TEXT =
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT;
export const E2E_ANON_SNAPSHOT_MUSIC_ITEM_ID_TEXT =
  E2E_MUSIC_TRACK_ONE_ID_TEXT;

/**
 * Deterministic playback positions in seconds, kept here so the
 * specs and the seed agree on the same numeric assertions.
 *
 * Durations match the committed fixtures in
 * `tools/test-assets/assets/e2e/audio/` — see step 1b.
 */
export const E2E_PODCAST_ITEM_RESUME_P_POS_SECONDS = 5; // matrix § 1 item-podcast row, "p > 0" case
export const E2E_PODCAST_ITEM_RESUME_DURATION_SECONDS = 60; // fixture: e2e-podcast-resume-60s-440hz.mp3
export const E2E_PODCAST_ITEM_RESUME_NEAR_END_P_SECONDS = 57; // 60 - 3 → near-end clamp triggers (matrix § near-end clamp)

export const E2E_CLIP_START_SECONDS = 5;
export const E2E_CLIP_END_SECONDS = 12;
export const E2E_SOUNDBITE_START_SECONDS = 14;
export const E2E_SOUNDBITE_DURATION_SECONDS = 6;

export const E2E_CHAPTER_ONE_START_SECONDS = 1;
export const E2E_CHAPTER_ONE_END_SECONDS = 5;
export const E2E_CHAPTER_TWO_START_SECONDS = 6;
export const E2E_CHAPTER_TWO_END_SECONDS = 10;

export const E2E_MUSIC_TRACK_ONE_P_SECONDS = 7; // stored but ignored — matrix § 1 item-music row says always 0
export const E2E_MUSIC_TRACK_DURATION_SECONDS = 30; // fixture: e2e-music-track-*-30s-*hz.mp3

export const E2E_ADD_BY_RSS_RESOURCE_WITH_POSITION_SECONDS = 25; // inside 60 s fixture

/**
 * Asset-server enclosure URLs for the seeded items. The asset server is
 * auto-started by the Playwright webServer config (port 2111). See step
 * 1b for fixture generation and the gitignore exception that pins them.
 */
export const E2E_ASSET_BASE_URL = 'http://localhost:2111/e2e/audio';

export const E2E_PODCAST_SHORT_ENCLOSURE_URL =
  `${E2E_ASSET_BASE_URL}/e2e-podcast-short-60s-440hz.mp3`;
export const E2E_PODCAST_RESUME_ENCLOSURE_URL =
  `${E2E_ASSET_BASE_URL}/e2e-podcast-resume-60s-440hz.mp3`;
export const E2E_MUSIC_TRACK_ONE_ENCLOSURE_URL =
  `${E2E_ASSET_BASE_URL}/e2e-music-track-one-30s-330hz.mp3`;
export const E2E_MUSIC_TRACK_TWO_ENCLOSURE_URL =
  `${E2E_ASSET_BASE_URL}/e2e-music-track-two-30s-294hz.mp3`;
export const E2E_ADDBYRSS_WITH_POSITION_ENCLOSURE_URL =
  `${E2E_ASSET_BASE_URL}/e2e-addbyrss-with-position-60s-440hz.mp3`;
export const E2E_ADDBYRSS_FRESH_ENCLOSURE_URL =
  `${E2E_ASSET_BASE_URL}/e2e-addbyrss-fresh-60s-440hz.mp3`;
```

The constants are deliberately exported individually (no default
export, no aggregate object) so specs can `import { CONST }` with a
clear dependency graph for any later refactor that wants to trim
unused ids.

### 2. Mirror constants in `tools/web/seed-e2e.mjs`

Add a JS-side block above the existing `E2E_LIVESTREAM_*` block:

```javascript
/** Sync with apps/web/e2e/helpers/seedConstants.ts */
const E2E_PODCAST_CHANNEL_ID_TEXT = 'e2ePodChnl001';
const E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT = 'e2ePodResume01';
/* ...etc, full mirror of the TS constants above... */

// Asset-server enclosure URLs (mirror of step 1b)
const E2E_ASSET_BASE_URL = 'http://localhost:2111/e2e/audio';
const E2E_PODCAST_SHORT_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-podcast-short-60s-440hz.mp3`;
const E2E_PODCAST_RESUME_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-podcast-resume-60s-440hz.mp3`;
const E2E_MUSIC_TRACK_ONE_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-music-track-one-30s-330hz.mp3`;
const E2E_MUSIC_TRACK_TWO_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-music-track-two-30s-294hz.mp3`;
const E2E_ADDBYRSS_WITH_POSITION_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-addbyrss-with-position-60s-440hz.mp3`;
const E2E_ADDBYRSS_FRESH_ENCLOSURE_URL = `${E2E_ASSET_BASE_URL}/e2e-addbyrss-fresh-60s-440hz.mp3`;
```

No new `INSERT` statements in this commit. Steps 2–5 each add their
own `INSERT` blocks below the existing livestream block, in the order
the execution-order document defines.

A one-line comment on the JS-side block reminds future readers:

```javascript
// Mirror of apps/web/e2e/helpers/seedConstants.ts. When changing
// either side, update both in the same commit.
```

### 3. Table inventory (reference for later steps)

The seed extensions across steps 2–5 touch these tables. This list
is informational only; no inserts in this commit:

| Step | Tables touched |
| ---- | -------------- |
| 2    | `feed`, `feed_log`, `feed_policy`, `channel`, `channel_about`, `channel_description`, `channel_image`, `item`, `item_enclosure`, `item_chapter`, `clip`, `item_soundbite`, plus the abridged playback table (verify exact name during step 2) |
| 3    | `feed`, `feed_log`, `feed_policy`, `channel` (medium=music), `channel_about`, `channel_description`, `channel_image`, `item` (album tracks), `item_enclosure`, abridged playback table, queue/auto-queue tables (verify exact names during step 3) |
| 4    | `add_by_rss_resource_data` (and any related credentials/encryption row required by API persistence; verify against existing `apps/api/src/controllers` usage) |
| 5    | None — purely Playwright `page.addInitScript` writing to `window.localStorage` |

The exact table names for the abridged playback row and the
queue/auto-queue rows are verified inside steps 2 and 3 (with ripgrep
against `packages/orm/src/entities`), not in step 1, to keep this
commit small.

### 4. Helper module placeholder note

Step 5 adds `apps/web/e2e/helpers/anonymousSnapshot.ts`. This commit
**does not** create that file; it only notes the planned location in
`seedConstants.ts`'s docblock so a future grep on
"anonymousSnapshot.ts" finds the intent.

## Out of scope

- Inserting any new DB rows (steps 2–5).
- Lifting any spec out of `test.fixme()` (steps 2–5).
- Editing `MEDIA-PLAYER-DECISION-MATRIX.md` (step 6).

## Exit criteria

- `apps/web/e2e/helpers/seedConstants.ts` exists and is exported as
  individual `export const` declarations.
- `tools/web/seed-e2e.mjs` has the mirror constant block above the
  existing `E2E_LIVESTREAM_*` block with an in-source sync note.
- `npm run lint -w apps/web` passes.
- `make e2e_seed_web` still succeeds and remains idempotent (no
  behavior change yet).
- Running `make e2e_test_report` produces the same pass/fail set as
  before this commit (all seven Phase 1 active web specs pass; the
  nine fixme'd specs are still skipped).

## Verification commands

```bash
npm run lint -w apps/web
make test_deps
make e2e_seed_web
make e2e_seed_web   # second run proves idempotency
make e2e_test_report
```
