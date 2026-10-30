**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 53 — E2E: a two-minute live HLS fixture with a rewindable window

## Rows

R22

## Runs after

none

## Files

tools/test-assets/src/asset-generator.ts
tools/test-assets/assets/e2e/hls/e2e-hls-rewind-vod.m3u8
tools/test-assets/assets/e2e/hls/e2e-hls-rewind-event.m3u8
tools/test-assets/assets/e2e/hls/e2e-hls-rewind-vod-*.ts
tools/web/seed-e2e.mjs
apps/web/e2e/helpers/seedConstants.ts
apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md

## Goal

The committed live HLS fixture (`e2e-hls-event.m3u8`) holds about 6 seconds, which is below the
30-second rewind threshold (`LIVE_MIN_REWIND_WINDOW_SECONDS`, plan 11). Add a static EVENT
playlist that holds 120 seconds in 6-second segments, and a seeded live item that plays it. With
hls.js's default live sync (three target durations, 18 s), the window is `[0, 120]` with the live
edge near 102 s: rewindable, with about 18 s of play before the buffer runs out.

Plan 52's web spec uses it. Area C noted the mobile device check can reuse it; keep the names
below stable.

## Change 1 — generator (`tools/test-assets/src/asset-generator.ts`)

`generateHlsAudioFixtures()` builds one VOD + EVENT pair with fixed names. Turn its body into a
private helper and call it twice:

```typescript
private async generateHlsAudioEventFixture(params: {
  baseName: string;        // 'e2e-hls' or 'e2e-hls-rewind'
  durationSeconds: number; // 6 or 120
  segmentSeconds: number;  // 2 or 6
}): Promise<void>;
```

- Names: VOD playlist `${baseName}-vod.m3u8`, segments `${baseName}-vod-%03d.ts`, EVENT playlist
  `${baseName}-event.m3u8`. For `e2e-hls` these are exactly today's names, so the existing
  committed files are skipped (skip-if-exists stays).
- The ffmpeg command is today's with `duration=${durationSeconds}` and
  `-hls_time ${segmentSeconds}` substituted. Keep `rewriteHlsSegmentLinesToBasenames` and
  `hlsEventPlaylistFromVod` as they are.
- `generateHlsAudioFixtures()` calls the helper with `('e2e-hls', 6, 2)` then
  `('e2e-hls-rewind', 120, 6)`. Update its doc comment: the second pair is long enough to rewind.
- `generate-e2e-media-fixtures.ts` needs no change (it already calls `generateHlsAudioFixtures()`).

Then generate and commit the new files:

```bash
npm run generate:e2e-media -w podverse-test-assets
```

This is an asset build, not a test. It needs `ffmpeg-static` installed (`npm run deps:init` has
done that in a set-up checkout). If it fails for a missing binary, stop and report; do not hand-write
segment files. Check that `e2e-hls-rewind-event.m3u8` has `#EXT-X-PLAYLIST-TYPE:EVENT`, 20 or 21
`#EXTINF` lines (ffmpeg can add a tiny tail segment, as it did for the 6-second pair), segment basenames, and no `#EXT-X-ENDLIST`. The other committed fixtures must be
byte-identical afterwards (`git status` shows only the new files).

## Change 2 — seed (`tools/web/seed-e2e.mjs`)

- After `E2E_HLS_VIDEO_EVENT_PLAYLIST_URL` (around line 310):
  `const E2E_HLS_REWIND_EVENT_PLAYLIST_URL = \`${E2E_HLS_ASSET_BASE_URL}/e2e-hls-rewind-event.m3u8\`;`
- After `E2E_LIVE_AV_HLS_VIDEO_ITEM_TITLE` (around line 334):
  `const E2E_LIVE_AV_HLS_REWIND_ITEM_ID_TEXT = 'e2eLiveHlsRw01';` (14 characters, inside the 9–15
  `nano_id_v2` range) and `const E2E_LIVE_AV_HLS_REWIND_ITEM_TITLE = 'E2E Live HLS Rewind Stream';`.
- After the `E2E_LIVE_AV_HLS_VIDEO_ITEM_ID_TEXT` `insertLiveItem` call, add one in the same shape
  as the HLS audio item (progressive MIME; the `.m3u8` path classifies it as HLS):

  ```javascript
  await insertLiveItem({
    idText: E2E_LIVE_AV_HLS_REWIND_ITEM_ID_TEXT,
    guidSlug: 'live-hls-rewind',
    title: E2E_LIVE_AV_HLS_REWIND_ITEM_TITLE,
    enclosureType: 'audio/mpeg',
    enclosureUrl: E2E_HLS_REWIND_EVENT_PLAYLIST_URL,
  });
  ```

- Add `hls rewind ${E2E_LIVE_AV_HLS_REWIND_ITEM_ID_TEXT}` to the closing `console.log` list after
  `hls video …`.

Before finishing, search `apps/web/e2e` and `apps/mobile/e2e` for assertions that count live items
in channel `e2eLiveAvChn01` or in the livestream lists (for example `toHaveCount` next to
`livestream` lists in `media-list-chips.spec.ts` and `podcasts-subscribed-filter.spec.ts`). The
channel already has several live items and none of those specs counted them when this plan was
written; if one does now, stop and report.

## Change 3 — `apps/web/e2e/helpers/seedConstants.ts`

After `E2E_HLS_VIDEO_EVENT_PLAYLIST_URL`:
`export const E2E_HLS_REWIND_EVENT_PLAYLIST_URL = \`${E2E_HLS_ASSET_BASE_URL}/e2e-hls-rewind-event.m3u8\`;`

After `E2E_LIVE_AV_HLS_VIDEO_ITEM_TITLE`:
`export const E2E_LIVE_AV_HLS_REWIND_ITEM_ID_TEXT = 'e2eLiveHlsRw01';` and
`export const E2E_LIVE_AV_HLS_REWIND_ITEM_TITLE = 'E2E Live HLS Rewind Stream';`.
Extend the block's doc comment by one sentence: the rewind item holds a 120-second window.

## Change 4 — decision matrix § 6c

In `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`, § 6c "Test feed
selection" table, add a row after "Live video HLS": Slot "Live audio HLS, rewindable", Choice
"Feed `e2eLiveAvChn01` / item `e2eLiveHlsRw01`, `e2e-hls-rewind-event.m3u8` (120 s, 6 s
segments)", Source the seed link used by the other rows, Scope "Live rewind, resume in place, and
go to live (live-controls spec)". Then run
`npx prettier --write apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`
(formatting only).

## Tests

No unit test: the generator change is covered by the committed output, and the seed by the E2E
spec in plan 52 (`media-player-livestream-live-controls.spec.ts`), which plays this item.

## Release scratchpad

none
