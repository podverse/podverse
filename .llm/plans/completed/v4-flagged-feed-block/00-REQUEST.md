# Carry v4 spam and takedown flags into v5

## Request

Will the feeds that were flagged carry over into the v5 migration so they don't reappear in our system? If not, you should write plans that ensure that is handled correctly and ask questions if you need to.

Is public false, I think, would indicate that the feed does not need to be migrated, although other tables that reference it may need whatever special handling we are doing to create the partial data row necessary. For example, clip or playlist item references for content that no longer exists in the system. Does your feed count? Include is public false in the 89,000? If yes, should we revise our plans so that we don't actually include the is public false?

## Operator answers

- Which v4 `flag_status` values must stay blocked in v5? **spam and takedown only.** `always-allow` stays an allow. `other` and `none` are not blocks.
- Where must that block apply? **Every way a feed enters:** Podcast Index sync, subscribe, Add by RSS, and OPML.
- Non-public (`isPublic` false): the feed does not need to be migrated. References from other tables still need the existing partial-row handling, for example a clip or playlist member whose show no longer exists. Do not add non-public podcasts to this block. Do not change the launch-queue count to drop them; they are already outside it.

## Glossary

- "is public false" is v4 `podcasts.isPublic = false`.
- "the 89,000" was the launch queue when any Matomo count above zero counted (25,041 viewed shows with no subscriber). The queue is now public subscribed shows (about 64,000 on that snapshot) plus public shows whose highest Matomo count is at least 3 and that no account subscribes to (214). Spam and takedown stay excluded. See `docs/proposals/v4-to-v5-migration/05-id-mapping-and-catalog-seeding.md`.

## Orientation

- v4 `podcasts.flag_status` is `none`, `spam`, `takedown`, `other`, or `always-allow` (`podverse-api` `src/entities/podcast.ts`). The v4 parser refuses `spam`, `takedown`, and `other`. This set blocks only `spam` and `takedown`.
- The launch queue and `isSeedablePodcast` in `apps/workers/src/commands/orm/v4Library/copyAccountLibraryLib.ts` already require a public podcast that is not `spam` or `takedown`. `classifyStageCatalog` in `apps/workers/src/commands/orm/v4Catalog/seedStageCatalogLib.ts` does not put those shows in `creates`. The pilot's 7,811 queued feeds are creates only. No catalog plan needs a change to drop non-public shows.
- A clip or playlist member whose show will not exist is a snapshot (`keptRowKind` returns `snapshot` for episode outcome `gone`). History, queue, and now playing for that show are dropped (`playbackRowKind`). Leave that behavior as it is.
- Skipping the seed does not record a block. `FeedService.getOrCreate` in `packages/orm/src/services/feed/feed.ts` inserts a new feed with no flag check. Podcast Index trending reaches that through `mqRSSAdd` (`apps/workers/src/commands/mq/rss/mqRSSAddTrendingPodcastsFromPodcastIndex.ts`).
- v5 already turns parsing, public listing, and adding off for `spam_detected` and for lifecycle `takedown` (`packages/orm/src/lib/feedEffectivePolicyComputed.test.ts`). No migration step fills those from v4.
- The block is every v4 podcast with `flag_status` `spam` or `takedown`, including shows that are not in the launch queue. A later add of that Podcast Index id or authority URL must not create a feed that can be parsed, listed, or added. Subscribing, Add by RSS, and OPML use the same gate as Podcast Index sync.
