# Import v4 spam and takedown as blocked v5 feeds

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

## Rows

R1. Every v4 podcast with `flag_status` `spam` or `takedown` must become a v5 feed that cannot be parsed, listed, or added.

## Runs after

none

## Files

- `apps/workers/src/commands/orm/v4Catalog/importFlaggedFeedsLib.ts`
- `apps/workers/src/commands/orm/v4Catalog/importFlaggedFeedsLib.test.ts`
- `apps/workers/src/commands/orm/v4Catalog/importFlaggedFeeds.ts`
- `apps/workers/src/commands/index.ts`
- `apps/workers/src/lib/startup/categoriesForCommand.ts`
- `apps/workers/src/lib/startup/categoriesForCommand.test.ts`
- `apps/workers/package.json`
- `packages/worker-commands/src/registry.ts`

## Tests

Unit tests in `importFlaggedFeedsLib.test.ts` for the decision function below. No database and no v4 connection in those tests.

## Release scratchpad

none. Prompt 2 appends the scratchpad entry for the whole set.

## Decisions

- Represent the block as a `feed` row plus the existing policy. Do not add a table.
- `spam` sets `feed_condition` `spam_detected` active, source `auto`, note `v4 flag_status spam`. Do not set `spam_permitted`. Leave lifecycle `active`. `computeEffectivePolicyFromConditionKeys` then sets parse, public, and add to false.
- `takedown` sets condition `takedown_active` active, source `auto`, note `v4 flag_status takedown`, and lifecycle `takedown` with `reasonKey` `other`, the same note, and source `system`. `active` → `takedown` is an allowed transition. `from === to` is allowed, so a second run is safe.
- Do not create a `channel`. A feed with no channel is not a public show. Prompt 2 stops the parser from creating one later.
- Do not queue a parse.
- `other`, `none`, and `always-allow` are not read and not written.
- Non-public podcasts are not read for this command.
- Logs are counts only. Do not log a podcast id, a feed URL, an email, or `V4_DATABASE_URL`.

## Decision function

Put this in `importFlaggedFeedsLib.ts` and test it there. It does no I/O.

Inputs: the v4 flag (`spam` or `takedown`), whether the Podcast Index id parses with the same rules as `parsePodcastIndexId` in `apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.ts`, whether an authority URL is present after trim, and the local feed already stored for that Podcast Index id or that canonical URL.

Outcomes:

- `skip_no_podcast_index_id` — the id is missing, not all digits, or does not fit the v5 integer column. v5 `feed.podcast_index_id` is required.
- `skip_no_authority_url` — no authority URL. v5 `feed.url` is required. Checked after the id skip.
- `skip_url_held_by_other` — a local feed already uses that authority URL with a different Podcast Index id. Do not change that feed.
- `already_blocked` — a local feed for this Podcast Index id is already in the end state: `spam` has active `spam_detected` and is not `takedown` lifecycle; `takedown` is lifecycle `takedown` with active `takedown_active`. No write.
- `apply_spam` or `apply_takedown` — write the block onto the feed found by Podcast Index id, or create one when neither id nor URL is taken.

A local feed found by Podcast Index id is the one to update. Do not change its URL.

## Command

Name `v4ImportFlaggedFeeds`. Wire it the same way as `v4SeedAccountCatalog`:

- Export from `apps/workers/src/commands/index.ts`.
- Script `v4_import_flagged_feeds` in `apps/workers/package.json`: `node ./dist/index.js v4ImportFlaggedFeeds`.
- Registry entry in `packages/worker-commands/src/registry.ts`, category `orm`, risk `normal`.
- Add the name to `BASE_ORM_COMMANDS` in `categoriesForCommand.ts`. It needs Base and ORM only. It does not publish to MQ.
- Extend `categoriesForCommand.test.ts` with one expectation, beside the `v4SeedAccountCatalog` case.

Flags: `--dry-run` and `--help`. Help text says the command reads `V4_DATABASE_URL`, writes blocked feeds, creates no channel, and queues no parse.

Open the v4 client the way `readStageShows` does in `seedStageCatalog.ts` (`new Client({ connectionString })`, `connect`, `end` in `finally`). Read pages with `queryV4` from `seedCatalogApply.ts`. Refuse a non-local v5 database on both dry run and apply, using `assertLocalDatabase` from `copyAccountLibrary.ts`. Missing `V4_DATABASE_URL` throws `Missing V4_DATABASE_URL.`

Page the v4 read. Do not load every flagged podcast at once. Page size 500, keyset on `podcasts.id`:

```sql
SELECT DISTINCT ON (p.id)
       p.id,
       p."podcastIndexId" AS podcast_index_id,
       NULLIF(btrim(f.url), '') AS authority_url,
       p.flag_status::text AS flag_status
FROM podcasts p
LEFT JOIN "feedUrls" f
  ON f."podcastId" = p.id AND f."isAuthority" IS TRUE
WHERE p.flag_status IN ('spam', 'takedown')
  AND p.id > $1
ORDER BY p.id, f.url
LIMIT $2
```

Pass the last id as `$1` and `500` as `$2`. The first page uses `''`.

For each row, resolve the local feed with `FeedService.getByPodcastIndexId` and `FeedService.getByUrl` before any create. Canonicalize the URL with `canonicalHttpOrHttpsUrl` from `@podverse/helpers-validation`. Call `getOrCreate` only for `apply_spam` or `apply_takedown` when no feed exists for that id or URL.

Apply with `FeedService.applyFeedModerationChanges` so the condition, lifecycle, and policy recompute commit together. After apply, the feed's `feed_policy` has `parse_allowed`, `public_visible`, and `add_allowed` all false.

`--dry-run` reads v4 and the local feeds, runs the decision function, writes nothing, and creates nothing.

Log one line at the end with the counts: `apply_spam`, `apply_takedown`, `already_blocked`, `skip_no_podcast_index_id`, `skip_no_authority_url`, `skip_url_held_by_other`.

Do not run this command. Do not point it at the rehearsal database.
