# 765-enclosure-selection-session-state

**Master step:** P2.1.4
**Model (author + implement):** Opus 5
**Status:** done

## Scope

Replace audio-first URL resolution with labeled-enclosure selection seeded from the user's preferred
media type (`pmt`), held as session state on the playback session — matching web's
`mpEnclosureSelectedParams`.

### Today

- [`resolveItemAudioEnclosureUrl`](apps/mobile/src/lib/playback/resolveEnclosureUrl.ts) picks the
  first `audio/*` enclosure and ignores `readPlaybackMediaTypePref`.
- Downloads already call `buildLabeledItemEnclosures`
  ([`downloadEligibility.ts`](apps/mobile/src/downloads/downloadEligibility.ts)).
- Settings stores and syncs `pmt` (`audio` | `video`) via
  [`preferredMediaType.ts`](apps/mobile/src/prefs/preferredMediaType.ts).

### Target

1. On item load in `PlaybackProvider`, build labeled enclosures from `item.item_enclosures`.
2. If selection params are still the fresh default, apply
   `resolvePreferredMediaTypeEnclosureSelectedParams(labeled, readPlaybackMediaTypePref())`.
3. Resolve the playable URI with `getSelectedLabeledItemEnclosureAndSource` (helpers).
4. Hold `EnclosureSelectedParams` + labeled list on the session (React state / context), cleared or
   reset when the now-playing item identity changes — **session state, not a new SQLite column**.

Prefer importing from `@podverse/helpers` subpaths already used by downloads
(`@podverse/helpers/item/itemEnclosure` or the documented mobile-safe export).

### Call sites

Every path that currently calls `resolveItemAudioEnclosureUrl` / `resolvePlaybackUrl` must go through
the new resolver, including queue advance, car / native cache projections that embed a URL if any,
and E2E video seed loads.

Keep a thin `resolvePlaybackUrl(item, selectedParams)` helper under `lib/playback/` so screens do not
re-implement selection.

### Out of scope (later details)

- Source picker UI ([766](766-enclosure-source-picker.md))
- Enclosure-switch resume ([767](767-enclosure-switch-and-downloads.md))
- Video surface gating ([768](768-enclosure-driven-video-surface.md)) — may still show audio-only for
  video files until 768; selection must still pick the preferred type URL.

## Acceptance criteria

- Changing Settings playback media type affects the next item load's chosen enclosure.
- Session selection resets when a different item becomes now playing.
- Unit tests cover preferred-type seeding and default-enclosure fallback.
- No picker UI yet; no enclosure-switch seek yet.

## Web parity references

- [`useMediaPlayerControllerQueueHeadLoading.ts`](apps/web/src/hooks/useMediaPlayerControllerQueueHeadLoading.ts)
- [`packages/helpers/src/lib/item/itemEnclosure.ts`](packages/helpers/src/lib/item/itemEnclosure.ts)

## Verification

```bash
# Mobile
npm --prefix apps/mobile run test -- resolveEnclosure
# Mobile Maestro (smoke play still works)
npm run mobile:e2e:test -- play-mini-player
```
