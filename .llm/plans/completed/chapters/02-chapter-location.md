# Sub-plan 02: Chapter-level location (parse and persist)

## Goal

Add support for the JSON chapters spec’s per-chapter **location** object (name, geo, osm). Wire it through types, hash, DTO, compat, and ORM so location is parsed and stored. No new table: use existing `ItemChapterLocation` (item_chapter_id, name, geo, osm).

## References

- [JSON Chapters: location object](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/examples/chapters/jsonChapters.md) — name (required), geo (required), osm (optional).

## Files to change

- [packages/parser-mapping/src/types/partytime.ts](packages/parser-mapping/src/types/partytime.ts) — PIChapter
- [packages/parser-mapping/src/compat/chapters/hash.ts](packages/parser-mapping/src/compat/chapters/hash.ts) — getPIChapterMd5Hash
- [packages/helpers/src/dtos/item/itemChapterCreate.ts](packages/helpers/src/dtos/item/itemChapterCreate.ts) — DTOItemChapterCreate
- [packages/parser-mapping/src/compat/chapters/chapters.ts](packages/parser-mapping/src/compat/chapters/chapters.ts) — compatParsedChapters
- [packages/orm/src/services/item/itemChapter.ts](packages/orm/src/services/item/itemChapter.ts) — ItemChapterService (and possibly a small ItemChapterLocationService or inline repo usage)
- [packages/orm/src/entities/item/itemChapter.ts](packages/orm/src/entities/item/itemChapter.ts) — only if a relation to ItemChapterLocation is needed for loading (optional)

## Implementation

1. **PIChapter**  
   Add `location?: { name: string; geo: string; osm?: string } | null`.

2. **getPIChapterMd5Hash**  
   Include `location` in the object passed to `getMd5Hash` so changes to location affect data_hash.

3. **DTOItemChapterCreate**  
   Add `location?: { name: string | null; geo: string | null; osm?: string | null }`.

4. **compatParsedChapters**  
   When `chapter.location` is present and valid (name + geo per spec), map it onto the DTO’s `location`; otherwise omit or null.

5. **ItemChapterService**
   - Extend the DTO accepted by `update` / `_update` to include optional `location`.
   - After saving the ItemChapter (create or update), if the DTO has `location`, upsert **ItemChapterLocation** for that item_chapter: find by item_chapter.id; if exists, update name/geo/osm; if not exists, create with item_chapter_id. If DTO has no location and an ItemChapterLocation exists for that chapter, optionally delete it (or leave as-is; define in implementation).
   - Use the ORM repository for ItemChapterLocation (no need for a full ItemChapterLocationService if a single upsert helper is enough).

6. **ItemChapterDto**  
   Ensure it includes optional `location` so the compat layer can pass it through; ItemChapter entity does not store location (it lives in ItemChapterLocation).

## Out of scope

- item_chapters_object (Sub-plan 03).
- Web UI or API exposure.
