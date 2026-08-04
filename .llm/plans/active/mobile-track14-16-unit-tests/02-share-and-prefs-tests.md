# 02 — Share-URL parity + prefs store tests (15.5, 16.1)

**Cursor model:** Codex 5.3
**Ship bar:** Node-only vitest coverage for share-URL building and prefs get/set/hydrate + guards.

## Context (read first)

- `apps/mobile/src/lib/share/shareNowPlaying.ts` (imports `getMobileConfig` → `react-native`).
- `apps/mobile/src/prefs/prefsStore.ts` (imports `@react-native-async-storage/async-storage`;
  design-tokens + helpers are node-safe).
- `apps/mobile/vitest.config.ts` (node-only; narrow `include`).
- Skills: **unit-test-priority-confident**, **unit-test-design-no-overgranularity**.

## Tasks

1. **Extract pure share core** — Create `apps/mobile/src/lib/share/shareUrl.ts` with
   `buildPublicShareUrl(webBaseUrl, resource, idText)` and
   `buildNowPlayingShareUrl(webBaseUrl, target)` (import `type { PlaybackTarget }` only). Keep
   `shareNowPlaying.ts` as the thin wrapper that reads `getMobileConfig().webBaseUrl` and delegates
   (behavior-preserving; existing exports/signatures unchanged for callers).
2. **`apps/mobile/src/lib/share/shareUrl.test.ts`** — assert `/<resource>/<id_text>` shapes per
   target kind (`clip`→clip; `item-*`/`soundbite`/`chapter`→episode; `livestream`→podcast;
   `add-by-rss`→`null`); verify trailing-slash-free base joining.
3. **`apps/mobile/src/prefs/prefsStore.test.ts`** — `vi.mock('@react-native-async-storage/async-storage')`
   with an in-memory map; cover: boolean parse (`'true'`/`'false'`/other→null) for `aqc.rd`/`aqc.rp`/
   `downloads.auto_delete`; enum guards reject invalid stored values (`uit`, `pmt`,
   `preferred_media_type`, `*.subscriptionFilter`) → `null`; `setPref` writes `'true'`/`'false'` for
   booleans and raw strings otherwise; `hydratePrefs` returns a full snapshot with nulls for unset keys.
4. Add both test files to the `include` array in `apps/mobile/vitest.config.ts` (and update the header
   comment listing covered modules).

## Acceptance

- Share URL parity covered for every `PlaybackTarget` kind incl. `add-by-rss`→null.
- Prefs get/set/hydrate + validation guards covered with mocked AsyncStorage.
- New files listed in `vitest.config.ts` `include`.
