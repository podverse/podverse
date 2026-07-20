# 494-data-layer-add-by-rss-parser-mapping

**Master step:** 9b.5
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- After server parse + poll (`POST /account/add-by-rss/parse` + status), run
  `@podverse/parser-mapping` (`convertParsedRSSFeedToCompat` and related) like web.
- Persist feeds + mapped item index in SQLite; retire slim AsyncStorage-only
  `src/prefs/addByRSSFeeds.ts` as the source of truth (may keep prefs for non-entity keys).
- Update `useAddByRssAddFlow` / `useAddByRssFeeds` / domain helpers to use the repository.
- Playback continues via `PlaybackTarget.kind: 'add-by-rss'` with full
  `AddByRSSResourceData` from mapped data (not only `items[0]` preview). Wired via
  `toAddByRssPlaybackResourceData` (reads `addByRssRepository.getMappedFeedByUrl`, builds the index
  item with parser-mapping `toIndexItem` + `buildAddByRSSResourceData`, merges the SQLite
  `playback_position`) consumed by `useAddByRssPlayback`; slim record is the offline fallback.

## Acceptance criteria

- Added feed shows mapped title/image/items from parser-mapping output
- No `@podverse/parser` import in mobile
- Offline list of previously added feeds works from SQLite
- Add-by-RSS E2E (including playback with test-assets) still passes

## Web parity references

- Web: `apps/web/src/utils/addByRSS/actions.ts` (`convertParsedRSSFeedToCompat`)
- [DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md §4.1](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md)
- Skills: **add-by-rss-parity-sync**, **mobile-data-layer**

## Verification

```bash
npm run mobile:e2e:test -- add-by-rss
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
