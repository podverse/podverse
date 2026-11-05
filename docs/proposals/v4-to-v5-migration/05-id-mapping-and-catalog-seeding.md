# 05 — ID Mapping and Catalog Seeding

## Goal

Define how v4 shortids become v5 channels and items, and which feeds must exist
in v5 before user data can attach to them.

## Status

Draft. Needs operator review.

## What we know

- v4 podcasts: shortid `id`, optional unique `podcastIndexId`, related
  `feedUrl` rows (`isAuthority`).
- v5 channels: `id_text` (nanoid) via `feed_id` → `feed.podcast_index_id`
  (required for PI feeds). No v4 shortid column on `channel`.
- v5 also tracks merges and pending follows by `podcast_index_id`.
- Add-by-RSS in v4 may exist only as a URL on the user until ingest succeeds.
- Matomo is not wired in the v5 monorepo. v4 already stores aggregated
  `stats_podcast` / `stats_episode` / `stats_media_ref` from Matomo jobs.

## Proposed approach

### Crosswalk chain (podcast / channel)

```text
v4 podcast.id (shortid)
  → podcast.podcastIndexId  (preferred)
  → else authority feedUrl.url
  → v5 feed by podcast_index_id or by URL
  → v5 channel
```

### Crosswalk chain (episode / item)

```text
v4 episode.id
  → parent podcast crosswalk
  → match by guid, else enclosure URL, else title+pubDate (weak)
  → v5 item
```

### Crosswalk chain (clip / mediaRef)

```text
v4 mediaRef
  → matched v5 item
  → recreate clip with start/end (and title) if the item exists
```

### Durable legacy map

Keep a permanent table or store (exact schema TBD in a later plan) such as:

- `legacy_kind` (`podcast` | `episode` | `mediaRef` | `playlist` | `user`)
- `legacy_id` (v4 shortid / uuid)
- `v5_id_text` (nullable until resolved)
- `resolve_key` (podcast index id, feed URL, guid, …)
- `status` (`mapped` | `unresolved` | `dropped`)

Uses: login migration, web redirects ([11](11-web-api-and-url-cutover.md)),
mobile first-launch remap ([08](08-mobile-first-launch-migration.md)), and
support lookups.

### Catalog seeding order

1. Collect every podcast id and feed URL referenced by subscriptions, playlists,
   queue, history, now playing, notifications, and clips.
2. Ensure those feeds exist in v5 (queue parse jobs). Do not bulk-copy the whole
   v4 catalog unless rehearsal shows it is cheaper than selective seed.
3. Optionally seed popularity from `stats_podcast` (and related) keyed by the
   same crosswalk — **no live Matomo query required**.
4. Build the legacy map as feeds and items become available; retry unresolved
   rows.

## Honest limits and risks

- Podcasts without `podcastIndexId` and with dead feed URLs may never map.
- Episode guid quality varies by publisher. Some history/queue rows will drop.
- Seeding "everything users touch" still means large parse volume; measure in
  [06](06-database-migration-rehearsal.md).
- Redirects for unmapped ids should land on a friendly "not found / search"
  page, not a 500.

## Open questions

- Persist the legacy map in the app DB, a side database, or an export file used
  by workers?
- How long to keep unresolved rows before marking `dropped`?
- Seed global trending from v4 stats, or only feeds needed for user data?

## Future plan sets

- Schema + worker commands for the legacy map.
- Parse-queue sizing for selective seed.
- Redirect handler design for [11](11-web-api-and-url-cutover.md).
