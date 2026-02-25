# Chapters: overview and sub-plan order

## Who does the actual chapter parsing (current setup)

- **RSS (podcast:chapters tag):** Parsed by **partytime** when it parses the feed. It exposes `parsedItem.podcastChapters?.url` and `parsedItem.podcastChapters?.type`. Our code never parses the `<podcast:chapters>` XML; we only read partytime’s result in `compatItemChaptersFeedDto` and persist `ItemChaptersFeed` (url, type) linked to the item.

- **Chapters JSON (the file at that URL):** Fetched and parsed entirely in **our parser**:
  - **Fetch:** `packages/parser/src/lib/chapters/chapters.ts` — `getParsedChapters(item_chapters_feed)` calls `_request(item_chapters_feed.url)` to GET the JSON.
  - **Parse:** Same file reads `data.chapters` and casts to `PIChapter[]`.
  - **Map to DB shape:** `packages/parser-mapping/src/compat/chapters/chapters.ts` — `compatParsedChapters(chapters)` maps each `PIChapter` to `DTOItemChapterCreate`.
  - **Persist:** `packages/parser/src/lib/chapters/chapters.ts` — `parseChapters(item)` uses `ItemChapterService.update(item_chapters_feed, parsedChapter)` to upsert rows into `item_chapter` (keyed by item_chapters_feed + data_hash).

Partytime does **not** fetch or parse the chapters JSON; only the parser package does.

## Schema design: item_chapters_object

Instead of putting file-level metadata (author, title, podcastName, description, fileName, waypoints) on `item_chapters_feed`, introduce a separate table so that:

- **item_chapters_feed** = reference from RSS (item_id, url, type). Unchanged role.
- **item_chapters_object** = one parsed “chapters file” snapshot: holds file-level metadata (author, title, podcast_name, description, file_name, waypoints). 1:1 with item_chapters_feed (one object per feed reference; we update that row on each parse).
- **item_chapter** = one chapter row; belongs to **item_chapters_object** (FK `item_chapters_object_id`), not directly to item_chapters_feed.

So: Item → ItemChaptersFeed (1:1) → ItemChaptersObject (1:1) → ItemChapter (1:many). Chapters are assigned to the object; the object holds the metadata for the JSON file we parsed.

## Sub-plan execution order

| Order | File | Summary |
|-------|------|--------|
| 1 | [01-generate-chapters-json.md](01-generate-chapters-json.md) | Test-assets: generate and write chapters JSON files per item; timestamps ≤ media duration; min 3 chapters, min 10s each; optional toc:false overlays. |
| 2 | [02-chapter-location.md](02-chapter-location.md) | Add chapter-level location (PIChapter, hash, DTO, compat, ItemChapterService + ItemChapterLocation). |
| 3 | [03-item-chapters-object-schema.md](03-item-chapters-object-schema.md) | New table item_chapters_object (file-level metadata); item_chapter points to item_chapters_object; migration. |
| 4 | [04-parser-chapters-object.md](04-parser-chapters-object.md) | Parser: parse full chapters JSON; create/update item_chapters_object; assign item_chapter rows to item_chapters_object. |

Execute in order: 01 (no schema dependency), 02 (no new table), 03 (schema), 04 (parser uses new schema).

## Spec coverage (chapters.md + jsonChapters.md)

**RSS tag** ([chapters.md](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/chapters.md)): Parent `<item>`, single `<podcast:chapters>`, **url** (required), **type** (required, `application/json+chapters`). Covered by existing ItemChaptersFeed and 01 (we emit url + type per item).

**Root chapters object** ([jsonChapters.md](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/examples/chapters/jsonChapters.md)): **version** (required) — 01 generates `"1.2.0"`; not persisted (optional: add `version` to item_chapters_object for audit). **chapters** (required) — 01 + parser. Optional **author, title, podcastName, description, fileName, waypoints** — 03 (item_chapters_object) + 04 (parser).

**Chapter object**: **startTime** (required, float seconds) — 01 number, existing store. Optional **title, img, url, toc, endTime** — 01 + existing. Optional **location** (object) — 02 (parse + ItemChapterLocation).

**Location object**: **name** (required), **geo** (required, geoURI), **osm** (optional) — 02 + existing ItemChapterLocation schema.

**Ordering**: Spec says “Chapter order is assumed to be in ascending order based on the startTime”. 01 sorts generated array by startTime; parser can optionally sort on ingest (currently stores as-is).

**Gaps / optional**: (1) **Content-Type** — Spec says the file “should be served with Content-type of 'application/json+chapters'”. Test-assets server does not set this; add when serving chapters JSON if we want spec-compliant responses for parser fetches. (2) **version** — We do not persist the format version string; optional column on item_chapters_object.
