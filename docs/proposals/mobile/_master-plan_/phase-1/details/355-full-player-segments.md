# 355-full-player-segments

**Master step:** 11.10
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Full player chapter/soundbite list when applicable to now-playing item.

## File paths

- Episode/chapters request helpers via repository if exists

## Acceptance criteria

- Chapters/soundbites render when metadata present
- Tap seeks / bounded play via 10.17
- Hidden when none

## Web parity references

- Web full player segment lists
- Item chapters API wrappers

## Verification

```bash
npm run mobile:e2e:test -- podcast-episode
```

## Depends on

- 11.5, 10.17

## Implementation notes

- `apps/mobile/src/screens/player/FullPlayerSegments.tsx` — rendered inline in the full player from
  the now-playing item/channel (extracted from `activeTarget`; add-by-RSS has none). Soundbites read
  from the embedded `item.item_soundbites`; chapters fetched once via a new `segmentsRepository`
  (`reqItemParseAndGetChapters`, filtering `table_of_contents === false`) when
  `item.item_chapters_feed` is present. Returns `null` when the item has neither (hidden when none).
- Tap a chapter → `playChapter`; tap a soundbite → `playSoundbite` (bounded playback, Track 10.17).
- testIDs: `full-player-segments`, `full-player-chapters`, `full-player-soundbites`,
  `full-player-chapter-<id>`, `full-player-soundbite-<id>`.
- Repository: `apps/mobile/src/data/repositories/segmentsRepository.ts` (exported from `data`).
