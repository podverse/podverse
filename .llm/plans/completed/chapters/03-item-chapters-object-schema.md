# Sub-plan 03: item_chapters_object table and schema

## Goal

Introduce a table **item_chapters_object** that holds file-level metadata for a parsed chapters JSON file. **item_chapter** rows are assigned to **item_chapters_object** (not directly to item_chapters_feed). Relationship: ItemChaptersFeed (1:1) → ItemChaptersObject (1:1) → ItemChapter (1:many).

## Rationale

- **item_chapters_feed** stays the RSS reference (item_id, url, type).
- File-level metadata (author, title, podcastName, description, fileName, waypoints) lives on **item_chapters_object**, not on item_chapters_feed.
- Each parse produces one “chapters object” (one row) and many chapter rows; linking chapters to the object keeps a clear boundary between “the file we parsed” and “the chapters in that file.”

## Schema

**item_chapters_object**

- `id` (PK)
- `item_chapters_feed_id` (FK, unique) — 1:1 with item_chapters_feed
- `version` (varchar, nullable) — format version from JSON (e.g. "1.2.0") for audit
- `author` (varchar, nullable)
- `title` (varchar, nullable) — episode title from the file
- `podcast_name` (varchar, nullable)
- `description` (text or varchar, nullable)
- `file_name` (varchar, nullable)
- `waypoints` (boolean, nullable or default false)

**item_chapter**

- Change FK from `item_chapters_feed_id` to `item_chapters_object_id` (FK to item_chapters_object). So item_chapter belongs to item_chapters_object; item_chapters_object belongs to item_chapters_feed.

**item_chapters_feed**

- Remove the OneToMany to ItemChapter (chapters are reached via item_chapters_object). Keep url, type, item_id, and relation to ItemChaptersFeedLog.

## Migration

1. Create table `item_chapters_object` with columns above.
2. For existing data: create one `item_chapters_object` per existing `item_chapters_feed` (with nulls for metadata), then add column `item_chapters_object_id` to `item_chapter`, backfill from current `item_chapters_feed_id` (each item_chapter’s feed already has a unique object row), then drop `item_chapters_feed_id` from `item_chapter` and add FK to `item_chapters_object`.
3. Ensure item_chapters_object has a unique constraint or 1:1 relation on item_chapters_feed_id.

## ORM / code

- New entity **ItemChaptersObject** in packages/orm.
- **ItemChaptersFeed**: add OneToOne to ItemChaptersObject; remove OneToMany to ItemChapter (or keep for backward navigation via object if desired).
- **ItemChapter**: change ManyToOne from ItemChaptersFeed to ItemChaptersObject; update JoinColumn to item_chapters_object_id.
- **ItemChapterService**: all methods that currently take `item_chapters_feed` and query by `item_chapters_feed_id` must be updated to work with **item_chapters_object** (e.g. accept item_chapters_object or item_chapters_feed and resolve to the object). Prefer accepting item_chapters_object where possible so callers (parser) pass the object after creating/loading it.
- New **ItemChaptersObjectService** (or equivalent): getOrCreateByItemChaptersFeed(item_chapters_feed), updateMetadata(object, dto). Used by parser to ensure one object per feed and to set file-level metadata.

## Execution order

- Run this sub-plan **after** 02 (chapter location). Sub-plan 04 (parser) will then create/update item_chapters_object and assign item_chapter rows to it.
