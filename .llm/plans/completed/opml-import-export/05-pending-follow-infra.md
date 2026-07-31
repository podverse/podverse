# 05 — Pending-follow infrastructure

**Phase 2 foundation.** Required by the import job (**06**) tier-2 resolution.

## Problem

When an OPML feed is not in our DB but is found in Podcast Index, we enqueue an indexed on-demand
parse. The `channel` row does not exist yet, so we cannot create a directory follow
(`AccountFollowingChannelService.followChannel` resolves an existing `channel_id_text`). We record a
**pending follow** that auto-resolves when the parse creates the channel.

## Read first

- **linear-sql-greenfield-only** skill, **trust-foundation-schema-only** skill, and
  [.cursor/rules/linear-baseline-0004.mdc](/.cursor/rules/linear-baseline-0004.mdc). Schema is
  forward-only under `infra/k8s/base/ops/source/database/linear-migrations/app/`.
- [docs/operations/database/LINEAR-MIGRATIONS.md](/docs/operations/database/LINEAR-MIGRATIONS.md).

## Schema (linear migration)

1. New table `account_pending_following_channel`:
   - `account_id` (FK → account)
   - `podcast_index_id` (nullable) and/or `feed_url` (canonical) — the resolution keys
   - `created_at`
   - Unique on `(account_id, feed_url)` (and index on `podcast_index_id`).
   Add a new forward-only migration SQL file in the app linear-migrations dir; then regenerate
   baselines with `make db_regen_linear_baseline` and commit the generated `.gz` (do not hand-edit).

## ORM

2. Entity `packages/orm/src/entities/account/accountPendingFollowingChannel.ts` (mirror
   [accountFollowingChannel.ts](/packages/orm/src/entities/account/accountFollowingChannel.ts)).
3. Service `packages/orm/src/services/account/accountPendingFollowingChannel.ts`:
   - `addPendingFollow(account_id, { podcast_index_id?, feed_url })`
   - `getPendingFollowsForChannel({ podcast_index_id?, feed_url })` — used at resolution time
   - `removePendingFollow(id | keys)`
   Export from [packages/orm/src/index.ts](/packages/orm/src/index.ts).

## Resolution hook

4. When an indexed parse creates/updates a channel, resolve matching pending follows into real
   directory follows:
   - Locate where the indexed on-demand parser upserts a channel (worker path fed by
     [apps/api/src/controllers/mq/mq.ts](/apps/api/src/controllers/mq/mq.ts) `rss-on-demand`; the
     channel upsert lives in `@podverse/parser` / worker parse command). After a successful channel
     upsert, call `getPendingFollowsForChannel` by `podcast_index_id`/`feed_url`, create
     `AccountFollowingChannelService.followChannel` for each, then `removePendingFollow`.
   - Keep this idempotent (safe if the channel already existed / follow already present).

## Tests

- Unit/integration: add pending follow → simulate channel upsert resolution → directory follow row
  exists and pending row removed. Duplicate resolution is a no-op.

## Verification (operator)

```bash
npm run build:packages
npm run test -w @podverse/orm
npm run test:e2e:api
```
