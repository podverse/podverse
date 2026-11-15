# 01 — Legacy podcast map rows with the v4 feed URL

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

Add `v4_feed_url` to `legacy_id_map` and a worker command that writes one `podcast` row for every
v4 podcast, read-only against v4, in batches. The lookup route (02) reads these rows.

## Rows

R1, R3, R4

## Runs after

`add-by-rss-directory-match` (whole set). Nothing in this set.

## Files

- `infra/k8s/base/ops/source/database/linear-migrations/app/0011_legacy_id_map_v4_feed_url.sql`
  (new; use the next free number if `0011_` is taken by then, and rename everything below to match)
- `infra/k8s/base/ops/kustomization.yaml` (`API_EXPECTED_MIGRATION_FILENAME` L28, and the
  migration file list)
- `infra/k8s/base/api/source/api.env` (the expected-migration key near L48)
- the generated `0004_app_linear_baseline.sql.gz` / `0005_management_linear_baseline.sql.gz`
  (run `make db_regen_linear_baseline`; this is a generator, not a test)
- `packages/orm/src/entities/legacyIdMap.ts`
- `apps/workers/src/commands/orm/v4Catalog/writeLegacyPodcastMapLib.ts` (new, pure)
- `apps/workers/src/commands/orm/v4Catalog/writeLegacyPodcastMapLib.test.ts` (new)
- `apps/workers/src/commands/orm/v4Catalog/writeLegacyPodcastMap.ts` (new)
- `apps/workers/src/commands/index.ts`
- `apps/workers/src/lib/startup/categoriesForCommand.ts` and its test
- `apps/workers/package.json`
- `packages/worker-commands/src/registry.ts`
- `docs/operations/database/LINEAR-MIGRATIONS.md` only if it lists migrations by name
- `release-notes/scratchpad.md`

Read **linear-sql-greenfield-only**, **migration-readiness-marker-sync**, and `AGENTS.md` §
Linear SQL migrations before writing the SQL. Register the command the same way
`v4ImportFlaggedFeeds` is registered (search `v4ImportFlaggedFeeds`; if that set has not landed,
copy `v4SeedStageCatalog`).

## 1. Migration

```sql
-- v4_feed_url is the v4 authority feed URL for a podcast row. It is public catalog data.

ALTER TABLE public.legacy_id_map ADD COLUMN v4_feed_url public.varchar_url;
```

Greenfield-only: no `IF NOT EXISTS`. The entity gains `v4_feed_url: string | null`
(`@Column({ type: 'varchar', nullable: true })`, matching how the entity declares its other
nullable text columns).

## 2. Pure planner

`writeLegacyPodcastMapLib.ts`:

```ts
export type V4PodcastMapSource = {
  id: string;
  podcastIndexId: string | null;
  authorityUrl: string | null;
  isPublic: boolean;
  flagStatus: string | null;
};
export type LegacyPodcastMapRow = {
  legacyId: string;
  status: 'unresolved' | 'dropped';
  resolveKey: string | null;
  v4FeedUrl: string | null;
};
export function planLegacyPodcastMapRow(source: V4PodcastMapSource): LegacyPodcastMapRow | null;
```

- `flagStatus` `spam` or `takedown` → `{ status: 'dropped', resolveKey: null, v4FeedUrl: null }`.
- Else no authority URL (null, empty, or not http/https after trim) → `null` (no row).
- Else `{ status: 'unresolved', resolveKey: isPublic && podcastIndexId is a positive integer
  string ? podcastIndexId : null, v4FeedUrl: authorityUrl.trim() }`.

## 3. Command `v4WriteLegacyPodcastMap`

- npm script `v4_write_legacy_podcast_map` in `apps/workers/package.json`.
- Reads `V4_DATABASE_URL` the same way `seedStageCatalog.ts` does (trim, throw when empty). v4 is
  read-only: `SELECT` only, in a read-only transaction.
- Keyset pages of 2,000 on `p.int_id`:

```sql
SELECT DISTINCT ON (p.int_id)
       p.int_id,
       p.id,
       p."podcastIndexId" AS podcast_index_id,
       NULLIF(btrim(f.url), '') AS authority_url,
       (p."isPublic" IS TRUE) AS is_public,
       p.flag_status::text AS flag_status
FROM podcasts p
LEFT JOIN "feedUrls" f ON f."podcastId" = p.id AND f."isAuthority" IS TRUE
WHERE p.int_id > $1
ORDER BY p.int_id, f.url
LIMIT 2000
```

- Each page is one multi-row insert into v5:

```sql
INSERT INTO legacy_id_map (legacy_kind, legacy_id, v5_kind, status, resolve_key, v4_feed_url)
VALUES ...
ON CONFLICT (legacy_kind, legacy_id) DO UPDATE SET
  resolve_key = EXCLUDED.resolve_key,
  v4_feed_url = EXCLUDED.v4_feed_url,
  status = CASE WHEN legacy_id_map.status = 'mapped' THEN 'mapped' ELSE EXCLUDED.status END
```

  with `legacy_kind = 'podcast'` and `v5_kind = 'channel'`. Never touch `v5_id_text` here.
- Flags: `-dryRun` (count only, no writes), `-maxPages N`, `-startAfterIntId N` (resume).
- Logs per page and at the end: pages, rows read, rows written by status, rows skipped. Counts
  only; no ids, URLs, or titles (**public-repo-no-secrets**).

## Tests

`writeLegacyPodcastMapLib.test.ts`: spam, takedown, `other`, `none`, `always-allow`, non-public
with a Podcast Index id (row, null key), public without one, blank URL, non-http URL.

## Release scratchpad

```markdown
## Legacy podcast map stores the v4 feed URL

- Surfaces: workers, ops (migration)
- Change: migration adds `legacy_id_map.v4_feed_url`. New worker command
  `v4WriteLegacyPodcastMap` (`npm run v4_write_legacy_podcast_map -w apps/workers`) writes one
  podcast row per v4 podcast with an authority feed URL, and a `dropped` row for spam and takedown,
  reading v4 read-only in pages of 2,000. Rows already mapped by the library copy keep their
  mapping.
- Who notices: no one directly; the legacy podcast lookup reads these rows
- Operator steps: apply migrations; run the command once against v4 before go-live (`-dryRun`
  first)
```
