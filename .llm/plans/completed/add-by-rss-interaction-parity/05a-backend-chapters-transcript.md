# Subplan 05a: Backend – Chapters and Transcript for Add-by-RSS

## Goal

Provide parsed chapters and transcript content for add-by-RSS episodes via the backend so the client never fetches chapters feed or transcript URLs (CORS). The client calls an **on-demand API endpoint** when the user opens the Chapters/Transcript tab (or on episode load). Backend fetches and parses server-side and returns the data.

## CORS constraint

Fetching the chapters feed URL and transcript URL **must** be done in a backend process. The client must not fetch those URLs from the browser.

**Implemented:** The client never fetches chapters or transcript URLs directly. It calls `POST /account/add-by-rss/chapters-transcript` with `chaptersFeedUrl` and/or `transcriptUrl` in the body; the API performs the HTTP requests server-side via `_request()` and returns parsed chapters and transcript text. This avoids CORS and keeps credentials off the client.

## Prerequisites

- Add-by-RSS bundle shape: each item has `chaptersFeed` (url + type, or null) and `transcripts` (metadata: url, type, language, rel from `compatItemTranscriptDtos`). No parsed chapter rows or transcript body in the bundle today.
- Parser-mapping: `compatParsedChapters` (PIChapter[] → DTOItemChapterCreate[]), `packages/parser-mapping/src/compat/chapters/chapters.ts`.
- Core APIs use DB item id: `reqItemParseAndGetChapters(item_id)`, `reqItemTranscriptGet(item_id)`. Add-by-RSS has no item_id, only idText.

## Approach: on-demand endpoint only

- **Chosen**: A new API endpoint. Client calls it when the user opens the Chapters/Transcript tab (or on episode load). Backend loads the add-by-RSS item (e.g. from parsed feed/bundle or by resolving idText), reads `chaptersFeed` and `transcripts` URLs, fetches and parses server-side, and returns parsed chapters and transcript.
- **No parse-time**: We do not fetch/parse chapters or transcript during add-by-RSS sync; only on demand via this endpoint.
- **No ownership verification**: The backend does not need to verify that the chapters feed or transcript URL belongs to the user’s feed. Client sends item identification (e.g. item idText; feed idText if needed to resolve the item). Backend fetches and returns; no auth check that the resource belongs to the requesting user.

## API contract (minimal)

- **Request**: Client sends the add-by-RSS item idText (e.g. query param `itemIdText` or in body). If the backend cannot resolve the item from idText alone, client also sends feed idText (e.g. `feedIdText`). Exact path and method (GET vs POST) to be chosen at implementation (e.g. `GET /api/add-by-rss/item/:itemIdText/chapters-transcript` or similar).
- **Response**: Return parsed chapters and transcript so the client can render them. Suggested shape: `{ chapters: DTOItemChapterLike[], transcriptText?: string }` (client can run `getTranscriptRowsFromTranscriptString(transcriptText)`), or `{ chapters: ..., transcriptRows?: TranscriptRow[] }` if backend parses transcript to rows. Use DTOItemChapter-like shape for chapters so client can pass directly to ListItemChapters. Document in API or OpenAPI when implemented.
- **Errors**: Return appropriate status when item not found, or chapters/transcript URLs unreachable; client can show empty state or error.

## Deliverables

- [ ] On-demand API endpoint: accepts add-by-RSS item idText (and feed idText if needed); backend fetches chapters feed and transcript URL server-side and parses; returns chapters (DTOItemChapter-like) and transcript (raw string or TranscriptRow[]).
- [ ] No ownership verification: endpoint does not check that the chapters/transcript resource belongs to the user’s feed.
- [ ] Document CORS constraint and that client never fetches chapters/transcript URLs.
- [ ] Optional: cache parsed result client-side (IndexedDB keyed by idText) or server-side; invalidation when feed is re-parsed.

## Files reference

| Area | Path |
| ---- | ---- |
| Add-by-RSS parse | `apps/api/src/controllers/account/accountAddByRSSParse.ts` |
| Parser-mapping chapters | `packages/parser-mapping/src/compat/chapters/chapters.ts` |
| Parser-mapping transcript DTOs | `packages/parser-mapping/src/compat/partytime/item.ts` (compatItemTranscriptDtos) |

## Audit

Verify backend returns parsed chapters and transcript for an add-by-RSS item that has chapters feed and transcript in the feed; no client-side fetch of those URLs.
