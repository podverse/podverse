import type { WorkerCommandDef, WorkerCommandListItem } from './types.js';

/**
 * One row per `KNOWN_COMMANDS` entry; `name` is the first CLI argument to `node …/index.js`.
 */
const WORKER_COMMAND_DEFS: readonly WorkerCommandDef[] = [
  {
    name: 'archiveAll',
    label: 'Archive all feeds',
    description: 'Run the archive-all pass over feeds (scheduled / operational batch).',
    category: 'archival',
    risk: 'normal',
    example_cli: 'npm run archive_all -w apps/workers',
  },
  {
    name: 'billingProcessDueRenewals',
    label: 'Billing: process due renewals',
    description:
      'Scan memberships due within 24h and attempt renewals via provider-agnostic adapter boundary.',
    category: 'billing',
    risk: 'normal',
    example_cli: 'npm run billing_process_due_renewals -w apps/workers',
  },
  {
    name: 'deleteOutdatedOnDemandParserEvent',
    label: 'Delete outdated on-demand parser events',
    description: 'ORM job: remove outdated on_demand_parser_event rows.',
    category: 'on_demand_parser',
    risk: 'normal',
    example_cli: 'npm run orm_on_demand_parser_event_delete_outdated -w apps/workers',
  },
  {
    name: 'generateOnDemandParserEventReports',
    label: 'Generate on-demand parser event reports',
    description: 'ORM job: build reports for on_demand_parser_event data.',
    category: 'on_demand_parser',
    risk: 'normal',
    example_cli: 'npm run orm_on_demand_parser_event_generate_reports -w apps/workers',
  },
  {
    name: 'imageShrinkBackfill',
    label: 'Image shrink backfill (enqueue)',
    description: 'Enqueue unresized list images for the image-shrink pipeline.',
    category: 'image',
    risk: 'normal',
    example_cli: 'npm run image_shrink_backfill -w apps/workers',
  },
  {
    name: 'imageShrinkCleanupOrphans',
    label: 'Image shrink orphan cleanup',
    description: 'Clean up image-shrink artifacts that no longer have referrers.',
    category: 'image',
    risk: 'normal',
    example_cli: 'npm run image_shrink_cleanup_orphans -w apps/workers',
  },
  {
    name: 'imageShrinkResetShrunkenDryRun',
    label: 'Image shrink full reset (dry run)',
    description:
      'Report shrink-generated WebP objects and matching is_resized DB rows that would be removed by imageShrinkResetShrunken.',
    category: 'image',
    risk: 'normal',
    example_cli: 'npm run image_shrink_reset_shrunken_dry_run -w apps/workers',
  },
  {
    name: 'imageShrinkResetShrunken',
    label: 'Image shrink full reset (bucket + DB)',
    description:
      'Delete all shrink-generated WebP objects and remove matching is_resized DB rows. Destructive.',
    category: 'image',
    risk: 'normal',
    example_cli: 'npm run image_shrink_reset_shrunken -w apps/workers',
  },
  {
    name: 'imageShrinkRunConsumer',
    label: 'Image shrink MQ consumer',
    description: 'Long-running consumer: resize and upload list-view images from the queue.',
    category: 'image',
    risk: 'long_running',
    example_cli: 'npm run image_shrink_run_consumer -w apps/workers',
  },
  {
    name: 'imageShrinkSourcePrune',
    label: 'Image shrink source prune',
    description: 'Prune old source material for the image shrink pipeline.',
    category: 'image',
    risk: 'normal',
    example_cli: 'npm run image_shrink_source_prune -w apps/workers',
  },
  {
    name: 'mqRSSAdd',
    label: 'MQ: add single feed (RSS add)',
    description: 'Queue one feed for parsing via ActiveMQ; requires queue and Podcast Index id.',
    category: 'mq',
    risk: 'normal',
    example_cli: 'npm run mq_rss_add -w apps/workers -- -q <queueName> -p <podcastIndexId>',
  },
  {
    name: 'mqRSSAddAll',
    label: 'MQ: add all feeds',
    description: 'Enqueue all feeds to the message queue (large operational run).',
    category: 'mq',
    risk: 'normal',
    example_cli: 'npm run mq_rss_add_all -w apps/workers',
  },
  {
    name: 'devPiBulkFeedsAddFromFile',
    label: 'Dev: bulk add feeds from file (Podcast Index)',
    description: 'Bulk-add feeds for development using a file input; not for ad hoc prod use.',
    category: 'dev',
    risk: 'dev_only',
    example_cli: 'npm run dev_pi_bulk_feeds_add_from_file -w apps/workers',
  },
  {
    name: 'mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex',
    label: 'MQ: add recently updated PI feeds',
    description: 'Enqueue recently updated feeds from the Podcast Index into the message queue.',
    category: 'mq',
    risk: 'normal',
    example_cli: 'npm run mq_rss_add_recently_updated_feeds_from_podcast_index -w apps/workers',
  },
  {
    name: 'mqRSSAddTrendingPodcastsFromPodcastIndex',
    label: 'MQ: add trending PI feeds to parse queue',
    description:
      'Fetches trending podcast ids from the Podcast Index (same cap as dev parse trending) and enqueues them for parsing.',
    category: 'mq',
    risk: 'normal',
    example_cli:
      'npm run mq_rss_add_trending_podcasts_from_podcast_index -w apps/workers -- -q rss-normal -n 50',
  },
  {
    name: 'mqRSSRunDlqConsumer',
    label: 'MQ: RSS DLQ consumer',
    description: 'Process failed RSS messages from the dead-letter queue.',
    category: 'mq',
    risk: 'long_running',
    example_cli: 'npm run mq_rss_run_dlq_consumer -w apps/workers',
  },
  {
    name: 'mqRSSRunLiveItemListener',
    label: 'MQ: live item listener',
    description: 'Long-running: listen and apply live item updates for feeds.',
    category: 'mq',
    risk: 'long_running',
    example_cli: 'npm run mq_rss_run_live_item_listener -w apps/workers',
  },
  {
    name: 'mqRSSRunParser',
    label: 'MQ: RSS parser consumer',
    description: 'Core long-running consumer: parse RSS from the main queue.',
    category: 'mq',
    risk: 'long_running',
    example_cli: 'npm run mq_rss_run_parser -w apps/workers',
  },
  {
    name: 'mqAddByRSSRunParser',
    label: 'MQ: Add-by-RSS parser',
    description: 'Long-running consumer for the Add-by-RSS flow.',
    category: 'mq',
    risk: 'long_running',
    example_cli: 'npm run mq_add_by_rss_run_parser -w apps/workers',
  },
  {
    name: 'reencryptAddByRSSCredentials',
    label: 'ORM: re-encrypt Add-by-RSS credentials',
    description: 'Re-encrypt stored Add-by-RSS credentials (maintenance / rotation).',
    category: 'orm',
    risk: 'normal',
    example_cli: 'npm run reencrypt_add_by_rss_credentials -w apps/workers',
  },
  {
    name: 'parserRSSParseFeed',
    label: 'Parser: single feed by Podcast Index id',
    description: 'One-off: parse a single feed by -p (podcast_index_id).',
    category: 'parser',
    risk: 'normal',
    example_cli: 'npm run parser_rss_parse_feed -w apps/workers -- -p <podcastIndexId>',
  },
  {
    name: 'devParserRSSParseTrendingFeeds',
    label: 'Dev: parse trending PI feeds to DB',
    description: 'Trending Podcast Index feeds → parse and save (dev seed; -max to cap).',
    category: 'dev',
    risk: 'dev_only',
    example_cli: 'npm run dev_parser_rss_parse_trending_feeds -w apps/workers -- -max 50',
  },
  {
    name: 'devParserRSSParsePodcasting20Feeds',
    label: 'Dev: parse Podcasting 2.0 feed helper set',
    description:
      'Parse and save a fixed helper set of Podcasting 2.0-related feeds by Podcast Index id.',
    category: 'dev',
    risk: 'dev_only',
    example_cli: 'npm run dev_parser_rss_parse_podcasting20_feeds -w apps/workers -- -f',
  },
  {
    name: 'seedEmbedDemoShowcaseFeeds',
    label: 'Seed embed demo showcase from Podcast Index feeds',
    description:
      'Parse four showcase Podcast Index feeds directly (always re-parses by podcast_index_id) and upsert seven embed_demo_showcase channel/item rows.',
    category: 'parser',
    risk: 'normal',
    example_cli: 'npm run seed_embed_demo_showcase_feeds -w apps/workers',
  },
  {
    name: 'podcastIndexDeadFeedsDeleteCache',
    label: 'Podcast Index: dead feeds cache delete',
    description: 'Delete cached data used for “dead feed” processing.',
    category: 'podcast_index',
    risk: 'normal',
    example_cli: 'npm run podcast_index_dead_feeds_delete_cache -w apps/workers',
  },
  {
    name: 'podcastIndexDeadFeedsFlagAndMerge',
    label: 'Podcast Index: dead feeds flag and merge',
    description: 'Flag/merge dead feeds in Podcast Index–related processing.',
    category: 'podcast_index',
    risk: 'normal',
    example_cli: 'npm run podcast_index_dead_feeds_flag_and_merge -w apps/workers',
  },
  {
    name: 'podcastIndexTrendingPodcastsGet',
    label: 'Podcast Index: get trending (list only)',
    description: 'Fetches trending podcasts list (no full parse in this job).',
    category: 'podcast_index',
    risk: 'normal',
    example_cli: 'npm run podcast_index_trending_podcasts_get -w apps/workers',
  },
  {
    name: 'podcastIndexValueUpdateAll',
    label: 'Podcast Index: update all value blocks',
    description: 'Refreshes value (value4value) data across known podcasts.',
    category: 'podcast_index',
    risk: 'normal',
    example_cli: 'npm run podcast_index_value_update_all -w apps/workers',
  },
  {
    name: 'statsUpdateAggregated',
    label: 'Stats: update aggregated',
    description: 'Recompute aggregated application statistics (cron / scheduled).',
    category: 'stats',
    risk: 'normal',
    example_cli: 'npm run stats_update_aggregated -w apps/workers',
  },
  {
    name: 'statsUpdateAggregatedRolling',
    label: 'Stats: update aggregated rolling',
    description: 'Rolling window variant of aggregated stats update.',
    category: 'stats',
    risk: 'normal',
    example_cli: 'npm run stats_update_aggregated_rolling -w apps/workers',
  },
] as const satisfies Readonly<readonly WorkerCommandDef[]>;

const names = WORKER_COMMAND_DEFS.map((c) => c.name);
if (new Set(names).size !== names.length) {
  throw new Error('worker-commands: duplicate command name in registry');
}

export type KnownCommandName = (typeof WORKER_COMMAND_DEFS)[number]['name'];

export const KNOWN_COMMANDS: readonly KnownCommandName[] = names as readonly KnownCommandName[];

export const WORKER_COMMANDS: readonly WorkerCommandDef[] = WORKER_COMMAND_DEFS;

/**
 * Exposed for the management API and for tests. Same order as `KNOWN_COMMANDS`
 */
export function getWorkerCommandListForApi(): WorkerCommandListItem[] {
  return WORKER_COMMANDS.map((def) => ({
    name: def.name,
    label: def.label,
    description: def.description,
    category: def.category,
    risk: def.risk,
    example_cli: def.example_cli,
    related_management_path: def.related_management_path ?? null,
  }));
}
