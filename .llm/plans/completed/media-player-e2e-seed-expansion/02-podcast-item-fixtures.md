# Step 2 — Podcast item fixtures

## Goal

Seed a regular (non-live) podcast channel with the items, clips,
soundbites, chapters, and stored playback positions needed by the
three podcast-flavored fixme'd specs. Lift those specs out of
`test.fixme()`.

## Scope

- DB inserts in [`tools/web/seed-e2e.mjs`](../../../tools/web/seed-e2e.mjs)
  for one new podcast channel and its dependent rows.
- Spec edits to remove `test.fixme()` and target the new ids on:
  - [`media-player-clip-soundbite-end-pause.spec.ts`](../../../apps/web/e2e/media-player-clip-soundbite-end-pause.spec.ts)
  - [`media-player-chapter-seek.spec.ts`](../../../apps/web/e2e/media-player-chapter-seek.spec.ts)
  - [`media-player-podcast-resume.spec.ts`](../../../apps/web/e2e/media-player-podcast-resume.spec.ts)

## Deliverables

### 1. Seed inserts in `tools/web/seed-e2e.mjs`

Append below the existing `E2E_LIVESTREAM_*` block. Inserts go in
this dependency order:

1. `feed` row (`url = 'https://e2e-seed-podcast.example/podcast.xml'`,
   distinct `podcast_index_id` from livestream).
2. `feed_log`, `feed_policy` rows referencing the feed.
3. `channel` row (`medium_id = SELECT id FROM medium WHERE value =
   'podcast'`, `id_text = E2E_PODCAST_CHANNEL_ID_TEXT`).
4. `channel_about`, `channel_description`, `channel_image` rows
   (mirrors the livestream channel pattern; without these the channel
   API endpoints 404 in tests).
5. Four `item` rows (`id_text` from `seedConstants.ts`):
   - **resume-positive item** — `title = 'E2E Podcast Resume P > 0'`,
     `id_text = E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT`.
   - **resume-near-end item** — `title = 'E2E Podcast Resume Near End'`,
     `id_text = E2E_PODCAST_ITEM_RESUME_NEAR_END_ID_TEXT`.
   - **resume-none item** — `title = 'E2E Podcast No Stored Position'`,
     `id_text = E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT`.
   - **chaptered item** — `title = 'E2E Podcast With Chapters'`,
     `id_text = E2E_PODCAST_ITEM_CHAPTERED_ID_TEXT`. Also acts as the
     host item for the clip and soundbite.
6. `item_enclosure` row per item — point at the local asset-server
   fixtures pinned by step 1b. Use:
   - chaptered / clip / soundbite item →
     `E2E_PODCAST_SHORT_ENCLOSURE_URL`
     (`http://localhost:2111/e2e/audio/e2e-podcast-short-60s-440hz.mp3`,
     60 s)
   - resume-positive, resume-near-end, resume-none items →
     `E2E_PODCAST_RESUME_ENCLOSURE_URL`
     (`http://localhost:2111/e2e/audio/e2e-podcast-resume-60s-440hz.mp3`,
     60 s)

   The asset server is auto-started by Playwright's `webServer`
   config so the browser actually fires `loadedmetadata`,
   `timeupdate`, and `ended` events. Specs fast-forward via
   `audio.evaluate(el => el.currentTime = N)` rather than waiting
   wall-clock seconds (see "Fast-forward pattern" in step 1b).
7. Two `clip` rows on the chaptered item using
   `E2E_CLIP_START_SECONDS = 5` / `E2E_CLIP_END_SECONDS = 12` and a
   second short clip for navigation (`start = 15`, `end = 20`) so the
   end-pause spec can verify the clip-cleared transition.
8. One `item_soundbite` row on the chaptered item using
   `E2E_SOUNDBITE_START_SECONDS = 14`, duration =
   `E2E_SOUNDBITE_DURATION_SECONDS = 6`.
9. Two `item_chapter` rows on the chaptered item:
   `chapter_one (start=1, end=5, title='Intro')` and
   `chapter_two (start=6, end=10, title='Topic A')`.
10. Abridged playback rows for the resume-positive and resume-near-end
    items. Verify the exact table name and columns via:

    ```bash
    rg -n "queueResourcesAbridgedIndex|abridged_index|abridged_p" \
      packages/orm/src apps/api/src
    ```

    Insert:

    - resume-positive: `p = E2E_PODCAST_ITEM_RESUME_P_POS_SECONDS = 5`,
      `d = E2E_PODCAST_ITEM_RESUME_DURATION_SECONDS = 60`.
    - resume-near-end: `p = E2E_PODCAST_ITEM_RESUME_NEAR_END_P_SECONDS =
      57`, `d = 60` → triggers the near-end clamp (matrix
      "5-second rule": `p >= d - 5`).
    - resume-none: **no row** (the absence is part of the test).

    Values were tightened in step 1b so they match the
    `e2e-podcast-resume-60s-440hz.mp3` fixture's real metadata
    duration of 60 s.

The seed must remain idempotent: prefer `DELETE FROM <table> WHERE
<idColumn> = $1 OR <fkColumn> IN (SELECT id FROM ... WHERE ...)`
patterns matching the livestream block, not `ON CONFLICT` (the
existing seed avoids `ON CONFLICT` because of the
`account_credentials` unique constraint nuance).

### 2. Spec lift — `media-player-clip-soundbite-end-pause.spec.ts`

Replace the `test.fixme()` calls with active tests covering the matrix
§ 6 clip / soundbite cells. The asset server pinned by step 1b serves
`e2e-podcast-short-60s-440hz.mp3` so `loadedmetadata` / `timeupdate`
fire deterministically.

- Test 1 (clip end pause): navigate to the clip detail page for
  `E2E_CLIP_ID_TEXT`, click play, assert the controller seeks to
  `E2E_CLIP_START_SECONDS = 5` on `loadedmetadata`. Then fast-forward
  via the audio element:

  ```typescript
  const audio = page.locator('audio').first();
  await audio.evaluate((el: HTMLAudioElement) => {
    el.currentTime = 13; // past E2E_CLIP_END_SECONDS + 1 = 12 + 1
  });
  ```

  Assert `mpIsPlaying === false` and `mpClip === null` (matrix § 6
  row 4).
- Test 2 (soundbite end pause): same shape for the soundbite. Set
  `currentTime` to `E2E_SOUNDBITE_START_SECONDS + E2E_SOUNDBITE_DURATION_SECONDS + 1.1`
  (i.e. `14 + 6 + 1.1 = 21.1`) and assert the matrix § 6 row 5
  transitions.

If a behavior assertion cannot be expressed via the existing
selectors, prefer adding a `data-testid` in a follow-up commit on
this branch rather than fixing it inline as a behavior change.

### 3. Spec lift — `media-player-chapter-seek.spec.ts`

Replace `test.fixme()` with:

- Test 1: navigate to the chaptered item, click the second chapter row
  (`E2E_CHAPTER_TWO_START_SECONDS = 6`); assert
  `loadedmetadata` triggers a seek to that start time and
  `mpItemChapter` reflects chapter two (matrix § 1 chapter row).
- Test 2: assign `audio.currentTime` past
  `E2E_CHAPTER_ONE_END_SECONDS = 5` (use `5.5`) via the fast-forward
  helper; the browser fires `timeupdate` immediately and the
  controller switches `mpItemChapter` to chapter two (matrix § 6
  row 6 chapter sync).

### 4. Spec lift — `media-player-podcast-resume.spec.ts`

Replace `test.fixme()` with three test branches. All three use the
`e2e-podcast-resume-60s-440hz.mp3` fixture (real 60 s duration).

- **`p > 0` case**: navigate to the resume-positive item; click play;
  assert seek to `E2E_PODCAST_ITEM_RESUME_P_POS_SECONDS = 5` on
  `loadedmetadata` (matrix § 1 item-podcast row).
- **near-end clamp case**: navigate to the resume-near-end item
  (abridged `p = 57`, `d = 60`); click play; assert seek to `0`
  because `p >= d - 5` triggers the clamp in
  `useMediaPlayerResourceUpdate` (matrix § near-end clamp section).
- **no stored position**: navigate to the resume-none item; click
  play; assert seek to `0` because no abridged row exists.

### 5. Constants imported via seedConstants helper

Each lifted spec imports its required constants from
`apps/web/e2e/helpers/seedConstants.ts` rather than hardcoding ids.
This preserves single-source-of-truth from step 1.

## Out of scope

- Music seeds (step 3).
- Add-by-RSS seeds (step 4).
- Anonymous snapshot helper (step 5).
- Removing the "Non-livestream E2E placeholders" subsection from the
  matrix (step 6 removes the whole subsection once all six specs are
  active).

## Exit criteria

- `make e2e_seed_web` succeeds and remains idempotent.
- `make e2e_test_web_report_spec
  SPEC=e2e/media-player-clip-soundbite-end-pause.spec.ts,e2e/media-player-chapter-seek.spec.ts,e2e/media-player-podcast-resume.spec.ts`
  passes all assertions for the three lifted specs.
- The three previously fixme'd specs no longer contain `test.fixme()`
  in source.
- The other six `media-player-*.spec.ts` specs and the seven Phase 1
  active specs remain green.

## Verification commands

```bash
make test_deps
make e2e_seed_web
make e2e_seed_web   # idempotency
make e2e_test_web_report_spec \
  SPEC=e2e/media-player-clip-soundbite-end-pause.spec.ts,e2e/media-player-chapter-seek.spec.ts,e2e/media-player-podcast-resume.spec.ts
```
