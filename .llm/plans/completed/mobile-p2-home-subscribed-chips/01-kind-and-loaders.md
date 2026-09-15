# 01 — Channel kind + subscribed Home loaders

**Cursor model:** Codex 5.3
**Reasoning:** high

Read [739-home-subscribed-channel-kind-and-loaders](/docs/proposals/mobile/_master-plan_/phase-2/details/739-home-subscribed-channel-kind-and-loaders.md)
and locked decisions in [00-SUMMARY.md](00-SUMMARY.md).

## Work

1. Migration 14: `ALTER TABLE subscribed_channel ADD COLUMN kind TEXT NOT NULL DEFAULT 'podcasts'`.
2. Update `schema.ts`, `SubscribedChannel` / merge mappers (kind from medium_id / resourceType).
3. Persist `kind` on insert/upsert; filter `list({ kind })`.
4. Directory hydration: `medium: 'all'` so music follows sync.
5. Rewrite `fetchHomeFeedRows` artists/albums/tracks/clips — never `type: 'global'`.
6. Podcasts list filters to `kind: podcasts`.
7. Unit tests for kind mapping.

Do not run tests during agent work.
