# Step 3 — Music album fixture

## Goal

Seed a music channel (album) with two tracks, a stored abridged
position, and the queue / auto-queue rows the music-playback spec
needs to verify the "music always seeks to 0" rules across explicit
play, track-ended, and auto-queue transitions.

## Scope

- DB inserts in [`tools/web/seed-e2e.mjs`](../../../tools/web/seed-e2e.mjs)
  for one music channel, one album, two tracks, and supporting rows.
- Spec edit to lift
  [`media-player-music-playback.spec.ts`](../../../apps/web/e2e/media-player-music-playback.spec.ts)
  out of `test.fixme()`.

## Deliverables

### 1. Seed inserts in `tools/web/seed-e2e.mjs`

Append below the podcast block from step 2. Inserts go in this
dependency order:

1. `feed` row (`url = 'https://e2e-seed-music.example/album.xml'`,
   distinct `podcast_index_id`).
2. `feed_log`, `feed_policy` rows.
3. `channel` row (`medium_id = SELECT id FROM medium WHERE value =
   'music'`, `id_text = E2E_MUSIC_CHANNEL_ID_TEXT`).
4. `channel_about`, `channel_description`, `channel_image` rows.
5. **Album row** — the existing podcast schema represents an "album"
   via the channel itself for medium=music, but per
   [`packages/orm/src/entities`](../../../packages/orm/src/entities),
   verify whether a separate `album` or `channel_album` row is needed.
   Resolve this during step 3 with:

   ```bash
   rg -n "medium.*music|MediumEnum.Music|album" packages/orm/src apps/api/src
   ```

   If a separate album entity exists, insert one with `id_text =
   E2E_MUSIC_ALBUM_ID_TEXT` linked to the music channel; otherwise the
   `id_text` constant points at the channel itself and the spec
   targets the music channel page.

6. Two `item` rows for the tracks:
   - **track one**: `id_text = E2E_MUSIC_TRACK_ONE_ID_TEXT`,
     `title = 'E2E Music Track One'`.
   - **track two**: `id_text = E2E_MUSIC_TRACK_TWO_ID_TEXT`,
     `title = 'E2E Music Track Two'`.
7. `item_enclosure` rows for each track using the asset-server
   fixtures from step 1b:
   - track one → `E2E_MUSIC_TRACK_ONE_ENCLOSURE_URL`
     (`http://localhost:2111/e2e/audio/e2e-music-track-one-30s-330hz.mp3`,
     30 s @ 330 Hz)
   - track two → `E2E_MUSIC_TRACK_TWO_ENCLOSURE_URL`
     (`http://localhost:2111/e2e/audio/e2e-music-track-two-30s-294hz.mp3`,
     30 s @ 294 Hz)

   Distinct frequencies keep the two fixtures byte-distinct.
8. Abridged playback row for **track one** only:
   `p = E2E_MUSIC_TRACK_ONE_P_SECONDS = 7`,
   `d = E2E_MUSIC_TRACK_DURATION_SECONDS = 30`. The matrix § 1
   item-music row says music **always** seeks to 0 regardless of `p`,
   so this row exists specifically to prove the rule under realistic
   data (a non-zero stored `p` that the controller ignores).
   Values match the 30 s music fixture's real metadata duration.
9. Queue / auto-queue rows: verify exact table names via:

   ```bash
   rg -n "active_queue|auto_queue|queue_resource" packages/orm/src apps/api/src
   ```

   For the E2E user account (existing seeded `e2e-user@example.com`),
   insert the rows needed for:
   - track one as the active queue head, with track two as the next
     upcoming entry (enables the track-ended path).
   - track two as an auto-queue entry (enables the auto-queue
     transition assertion in matrix § 4).

   Exact column shapes are deferred to step-3 implementation because
   they depend on the current ORM entity definitions; the seed is
   self-documenting once the inserts land.

### 2. Spec lift — `media-player-music-playback.spec.ts`

Replace the `test.fixme()` calls with three test branches. The
30 s music fixtures pinned by step 1b mean the spec can drive `ended`
deterministically via the audio element.

- **Explicit play seeks to 0** (matrix § 1 item-music row): navigate
  to the track-one page; click play; assert seek to `0` on
  `loadedmetadata` even though abridged `p = 7` exists.
- **Track-ended advances to track two and seeks to 0** (matrix § 5
  track-ended row, music): fast-forward track one to its end:

  ```typescript
  const audio = page.locator('audio').first();
  await audio.evaluate((el: HTMLAudioElement) => {
    el.currentTime = el.duration - 0.2;
  });
  ```

  The browser fires `ended` shortly thereafter. Assert track two
  loads and `mpCurrentTime === 0`.
- **Auto-queue transition seeks to 0** (matrix § 4 autoQueue row):
  with track two queued as auto-queue, advance via the autoQueue
  active row change; assert `currentTime === 0` after
  `loadedmetadata`.

### 3. Constants imported via seedConstants helper

Spec imports from `apps/web/e2e/helpers/seedConstants.ts`. No
hardcoded ids in the spec body.

## Out of scope

- Touching the podcast or add-by-RSS seed blocks.
- Implementing a music-specific page-navigation helper unless an
  existing helper proves insufficient during implementation; in that
  case add it under `apps/web/e2e/helpers/` rather than inline in the
  spec.
- Asserting any music-specific UI chrome (album art, track table,
  etc.) beyond what the matrix demands. Visual chrome is owned by
  separate album/music UI specs.

## Exit criteria

- `make e2e_seed_web` succeeds and remains idempotent (run twice in
  sequence).
- `make e2e_test_web_report_spec
  SPEC=e2e/media-player-music-playback.spec.ts` passes all three test
  branches.
- The previously fixme'd music spec no longer contains `test.fixme()`
  in source.
- The other five `media-player-*.spec.ts` specs and the seven Phase 1
  active specs remain green.

## Verification commands

```bash
make test_deps
make e2e_seed_web
make e2e_seed_web   # idempotency
make e2e_test_web_report_spec SPEC=e2e/media-player-music-playback.spec.ts
```
