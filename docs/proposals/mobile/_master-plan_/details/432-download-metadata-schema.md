# 432-download-metadata-schema

**Master step:** 13.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add SQLite (Drizzle) **downloads index** table + forward migration (next `user_version`).
- Columns (minimum): `item_id_text` (or stable local key), `file_path`, `byte_size`, `status`,
  `enclosure_url_hash`, `enclosure_uri`, `enclosure_mime` (nullable), `media_type`
  (`audio` | `video`), `file_extension` (nullable), progress fields (`bytes_downloaded`
  optional), `title` / artwork URL for list display, `updated_at`.
- Do **not** store livestream rows; eligibility rejects before insert.
- Add `downloadsRepository` under `apps/mobile/src/data/repositories/` — screens read this, not
  `req*`.
- Call `projectDownloadsIndexToNativeCache` stub on mutate (already in
  `apps/mobile/src/data/nativeCache/projection.ts`).

## Acceptance criteria

- Schema + migration land; `initializeDatabase` applies them
- Repository CRUD: upsert job, list by status, get by item, delete (+ file cleanup hook later)
- Unit-testable pure helpers (hash / path / eligibility) if non-trivial
- Documented in `apps/mobile/src/data/README.md` as Phase F (progressive files only; no live/HLS)

## Web parity references

- None for schema — mobile-only
- [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md) Phase F
- Format / live rules:
  [DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md)
  §1.1–1.2

## Verification

```bash
npm --prefix apps/mobile run test
```
