# 03 — Episode-chapters list runtime

Add a new list route kind whose rows are the chapters of a single episode. Unlike podcast/episode and album/track lists (each row a separate enclosure), all chapter rows share ONE enclosure (the episode) and differ by start/end time — a new loading behavior, similar to how clips seek within a parent item.

## Tasks

1. Add route kind `episode-chapters`:
   - `apps/web/src/lib/embed/embedTypes.ts` (`EmbedRouteKind`) and `EmbedDemoShowcaseRouteKind` in `packages/helpers/src/lib/constants/embedDemoShowcase.ts`.
   - `apps/web/src/lib/embed/getEmbedLayoutType.ts`: `episode-chapters` -> `'list'`.
2. New route `apps/web/src/app/embed/episode-chapters/[item_id]/page.tsx` delegating to `EmbedTypedRoutePage` with routeKind `episode-chapters`.
3. Fetch + mapping:
   - In `apps/web/src/lib/embed/fetchEmbedListData.ts` and `fetchEmbedListPageClient.ts`, add an `episode-chapters` branch calling `reqItemParseAndGetChapters(item_id_text)` (returns the full chapter list, ordered `start_time ASC`).
   - New mapper `mapItemChaptersToEmbedListRows` producing rows whose playback target is the parent episode enclosure seeked to the chapter `start_time` (model on the existing clip mapper which already handles segment-of-parent playback).
   - Support client-side asc/desc via the `sort` query param (the endpoint has no server sort; reverse the returned list when descending).
4. Href/context: `buildEmbedDemoHref` / `buildEmbedUrlEntityContext` map `episode-chapters` to `/embed/episode-chapters/{item}`.

## Notes

- Endpoint confirmed: `packages/helpers-requests/src/api/item/item.ts` `reqItemParseAndGetChapters` -> `GET /item/chapters/{item_id_text}/`; controller parses if stale then returns `ApiListResponse<ItemChapter>` ordered by `start_time ASC` with `end_time` assigned, no pagination.

## Verification

```bash
npm run test -w apps/web -- src/lib/embed/__tests__
make e2e_test_web_report_spec SPEC=e2e/embed.spec.ts
```
