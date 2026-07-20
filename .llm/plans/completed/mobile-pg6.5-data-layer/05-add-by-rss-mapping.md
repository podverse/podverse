# 05 — Add-by-RSS parser-mapping + SQLite persistence

Implement master step **9b.5**.

## Detail docs

- [494-data-layer-add-by-rss-parser-mapping](/docs/proposals/mobile/_master-plan_/details/494-data-layer-add-by-rss-parser-mapping.md)

## Decision / skills

- [DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md §4.1](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md)
- **add-by-rss-parity-sync**, **mobile-data-layer**

## Tasks

1. Keep server parse + poll (`POST /account/add-by-rss/parse` + status) — **no client XML parse**,
   no `@podverse/parser` import.
2. On `parsed`, run `@podverse/parser-mapping` (`convertParsedRSSFeedToCompat` and related) like
   web (`apps/web/src/utils/addByRSS/actions.ts`).
3. Upsert feeds + mapped item index into SQLite via `addByRssRepository` (name illustrative).
4. Retire `src/prefs/addByRSSFeeds.ts` as the **source of truth** (may keep AsyncStorage for
   non-entity prefs only).
5. Update `useAddByRssAddFlow` / `useAddByRssFeeds` / `src/lib/addByRss/domain.ts` to use the
   repository; playback via `PlaybackTarget.kind: 'add-by-rss'` with full `AddByRSSResourceData`
   from mapped data (not only slim `items[0]` preview).
6. Mark **9b.5** / **494** `done`.

## Acceptance

- Added feed shows mapped title/image/items from parser-mapping
- Offline list of previously added feeds from SQLite
- Add-by-RSS E2E (incl. playback / test-assets) intended to pass (operator verifies)

Do not run tests during agent work.
