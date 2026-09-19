# 01 — Playlist data layer

**Cursor model:** Codex 5.3 · **Reasoning:** high

Decisions 5 and 12 in [00-SUMMARY.md](00-SUMMARY.md) · Detail
[771](/docs/proposals/mobile/_master-plan_/phase-2/details/771-playlist-data-layer-and-offline-cache.md)

The repository, SQLite cache, and row mapper the later screens need. No screen UI rewrites yet —
wire callers that already hit the API so the seam exists before 02–05 rebuild screens on top of it.

## Migration 17

In `apps/mobile/src/data/db/migrations.ts` and `schema.ts`, add:

- `playlist` — id / id_text keys, ownership and follow flags as needed for list filters, full
  `DTOPlaylist` in `payload_json`, updated-at / watermark columns consistent with sibling tables
- `playlist_resource` — playlist foreign key, `list_position`, resource id, full
  `DTOPlaylistResource` in `payload_json`

Bump `LATEST_MIGRATION_VERSION` to **17**. Follow existing migration style (forward-only SQL, no
hand-edited baseline gz — this is mobile SQLite, not Postgres linear migrations).

## `playlistRepository`

`apps/mobile/src/data/repositories/playlistRepository.ts`, exported from the repositories index.
Mirror `queueRepository` / `exampleRepository` patterns: `MobileAuthRequestContext`, read-through
cache, write-behind on mutate, project native library-browse cache on mutations that change lists
the car can see.

Cover at least:

- List owned / followed (`reqPlaylistGetMany` with `private` / `private_followed`)
- Get / create / edit / delete playlist
- Follow / unfollow
- Resources paginated + private-all
- Resource add first / last / between and delete for item, clip, soundbite, add-by-RSS

Offline Mode: reads from SQLite; **writes refuse** with the existing offline unavailable path (no
outbox). State that guarantee in a short module comment — future-forward only.

Route `accountRepository.fetchFollowedPlaylistNodes` through this repository.

Unit-test the repository's happy-path list cache and a write-refused-when-offline case if the
pattern is easy to unit-test without a device; otherwise keep tests on the pure mapper below
([`unit-test-design-no-overgranularity`](/.cursor/skills/unit-test-design-no-overgranularity/SKILL.md)).

## Row mapper

Widen `playlistResourceToHomeRow` so add-by-RSS and redacted add-by-RSS stop returning `null`. Match
the queue mapper's approach (and reuse helpers if queue 01 already extracted shared add-by-RSS image /
title parsing). Unit-test: item, clip, soundbite, add-by-RSS, redacted, unusable → null.

## Out of scope

No LibraryPlaylistsScreen / detail / form / sheet UI changes — those are 02–05. Do not add a Home
chip or combined API type.

## Verification (operator)

```bash
# Mobile tab
npm --prefix apps/mobile run test -- src/lib/rows/homeRowMappers.test.ts
npm --prefix apps/mobile run test -- src/data/repositories/playlistRepository.test.ts
```
