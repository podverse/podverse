# Sub-plan 04: Parser — wire chapters object and file-level metadata

## Goal

Update the chapters parsing flow so that: (1) the full chapters JSON is parsed (file-level metadata + chapters array); (2) one **item_chapters_object** is created or updated per item_chapters_feed (with file-level metadata); (3) **item_chapter** rows are created/updated and assigned to that **item_chapters_object**. Depends on Sub-plan 03 (schema) and 02 (location).

## Current flow (recap)

- **getParsedChapters(item_chapters_feed)** in [packages/parser/src/lib/chapters/chapters.ts](packages/parser/src/lib/chapters/chapters.ts): fetches `item_chapters_feed.url`, reads `data.chapters`, returns `compatParsedChapters(chapters)` (array of DTOs).
- **parseChapters(item)**: gets item_chapters_feed from item; calls getParsedChapters; then for each parsed chapter calls ItemChapterService.update(item_chapters_feed, parsedChapter); and deleteManyByDataHash(item_chapters_feed, dataHashesToDelete).

## Changes

1. **Parse full JSON**
   - In getParsedChapters (or a sibling), parse and return both file-level fields (author, title, podcastName, description, fileName, waypoints) and the chapters array. Either return a shape like `{ metadata: {...}, chapters: ItemChapterDto[] }` or return chapters DTOs and a separate metadata object. Parser-mapping can expose a type for the raw chapters file and a compat that maps to metadata DTO + chapter DTOs.

2. **Get or create item_chapters_object**
   - In parseChapters, after a successful fetch, get or create the single ItemChaptersObject for this item_chapters_feed (e.g. via ItemChaptersObjectService.getOrCreateByItemChaptersFeed(item_chapters_feed)). Update its metadata from the parsed file-level fields: **version** (from JSON root), author, title, podcast_name, description, file_name, waypoints.

3. **Assign chapters to the object**
   - ItemChapterService must accept **item_chapters_object** (or its id) for update/getAll/deleteManyByDataHash, so that item_chapter rows are keyed by item_chapters_object_id. In parseChapters, pass the resolved item_chapters_object into the service calls instead of item_chapters_feed.

4. **Concrete steps**
   - Extend getParsedChapters (or add getParsedChaptersFile) to return `{ metadata: FileLevelMetadata, chapters: ItemChapterDto[] }`.
   - In parseChapters: call getParsedChapters; if null, return { parsed: false }. Otherwise getOrCreate ItemChaptersObject for item_chapters_feed; update object metadata from metadata; then run the same upsert/delete logic as today but using item_chapters_object (ItemChapterService.getAll( object ), update( object, dto ), deleteManyByDataHash( object, dataHashesToDelete )).
   - Ensure ItemChapterService methods that today take ItemChaptersFeed are updated to take ItemChaptersObject (or both, resolving feed → object internally). Prefer a single canonical parameter (item_chapters_object) for chapter CRUD.

## Files to touch

- [packages/parser/src/lib/chapters/chapters.ts](packages/parser/src/lib/chapters/chapters.ts) — getParsedChapters return shape; parseChapters flow (get/create object, update metadata, pass object to service).
- [packages/parser-mapping](packages/parser-mapping) — optional type for full chapters file; compat that produces metadata DTO + chapter DTOs.
- [packages/orm](packages/orm) — ItemChapterService signature and implementation (accept item_chapters_object); ItemChaptersObjectService (getOrCreateByItemChaptersFeed, updateMetadata). See Sub-plan 03.

## Out of scope

- Web UI.
- Changing how partytime or RSS parsing works (only our parser and ORM that consume the chapters JSON).
