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
    name: 'billingReconcile',
    label: 'Billing: reconcile purchases',
    description:
      'Retry failed webhook inbox rows, apply Google Play voided purchases, and recheck unsettled Strike checkouts. Never charges a payment method.',
    category: 'billing',
    risk: 'normal',
    example_cli: 'npm run billing_reconcile -w apps/workers',
  },
  {
    name: 'billingStrikeEnsureWebhook',
    label: 'Billing: ensure Strike webhook',
    description:
      'Create or update the Strike subscription that posts completed receives to this server. Logs the subscription id. Requires Strike to be enabled and BILLING_WEBHOOK_PUBLIC_BASE_URL.',
    category: 'billing',
    risk: 'normal',
    example_cli: 'npm run billing_strike_ensure_webhook -w apps/workers',
  },
  {
    name: 'billingImportLegacyMembershipExpiry',
    label: 'Billing: import legacy membership expiry',
    description:
      'Import email and membership_expires_at from a CSV or JSON-lines file as legacy_import grants. A dry run prints counts and writes nothing. Does not import payment transactions.',
    category: 'billing',
    risk: 'normal',
    example_cli:
      'npm run billing_import_legacy_membership_expiry -w apps/workers -- --file /absolute/path/legacy-membership.csv --dry-run',
  },
  {
    name: 'billingProcessorProductAdd',
    label: 'Billing: add processor product',
    description:
      'Add a Premium store-product row. An existing row is left unchanged, including one deactivated in management. PayPal and Strike accept --defaults for their fixed product ids.',
    category: 'billing',
    risk: 'normal',
    example_cli:
      'npm run billing_processor_product_add -w apps/workers -- --processor apple --cadence monthly --product-id com.example.premium.monthly',
  },
  {
    name: 'billingCheckoutChannelEnable',
    label: 'Billing: enable checkout channel',
    description:
      'Turn one checkout channel on. Never turns a channel off and never changes storefronts or the minimum client version.',
    category: 'billing',
    risk: 'normal',
    example_cli:
      'npm run billing_checkout_channel_enable -w apps/workers -- --processor apple --platform ios',
  },
  {
    name: 'scheduledJobsRunDue',
    label: 'Scheduled jobs: run due batch',
    description:
      'Claim and execute due scheduled_job rows with stale-lock recovery and retry backoff.',
    category: 'orm',
    risk: 'normal',
    example_cli: 'npm run scheduled_jobs_run_due -w apps/workers -- -limit 100',
  },
  {
    name: 'ormArchivedSlimReport',
    label: 'Archived content: slim report',
    description:
      'Counts and removable-row sizes for archived episodes and shows that are not slimmed.',
    category: 'orm',
    risk: 'normal',
    example_cli: 'npm run orm_archived_slim_report -w apps/workers',
  },
  {
    name: 'ormVerifiedPublisherLinksBackfill',
    label: 'Verified publisher links: backfill',
    description:
      'Recompute verified publisher links for every channel with publisher claims or stored links, from the stored references of both feeds. Writes nothing for a channel whose links already match. Use -afterId to resume and -dry-run to count without writing.',
    category: 'orm',
    risk: 'normal',
    example_cli: 'npm run orm_verified_publisher_links_backfill -w apps/workers -- -limit 500',
  },
  {
    name: 'notificationsPlatformPurge',
    label: 'Notifications: purge expired and terminal rows',
    description:
      'Delete expired account_notification rows and old terminal scheduled_job rows (daily retention cleanup).',
    category: 'orm',
    risk: 'normal',
    example_cli: 'npm run notifications_platform_purge -w apps/workers',
  },
  {
    name: 'notificationsTestPush',
    label: 'Notifications: send a test push',
    description:
      'List devices for one username, or send a visible test push to those devices and print each provider result. Refuses unless NOTIFICATIONS_TEST_PUSH_ENABLED is true. Does not write an inbox row.',
    category: 'orm',
    risk: 'normal',
    example_cli: 'npm run notifications_test_push -w apps/workers -- --username example --list',
  },
  {
    name: 'accountContentLogPurge',
    label: 'Removed Content: purge old rows',
    description:
      'Delete account_content_log rows whose updated_at is older than ACCOUNT_CONTENT_LOG_RETENTION_DAYS.',
    category: 'orm',
    risk: 'normal',
    example_cli: 'npm run account_content_log_purge -w apps/workers',
  },
  {
    name: 'accountSessionPurge',
    label: 'Account sessions: purge expired rows',
    description:
      'Delete account_session rows whose idle_expires_at is older than ACCOUNT_SESSION_RETENTION_DAYS.',
    category: 'orm',
    risk: 'normal',
    example_cli: 'npm run account_session_purge -w apps/workers',
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
    name: 'mqOpmlImportRun',
    label: 'MQ: OPML import consumer',
    description: 'Long-running consumer for async OPML import (3-tier feed resolution).',
    category: 'mq',
    risk: 'long_running',
    example_cli: 'npm run mq_opml_import_run -w apps/workers -- -q opml-import',
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
    name: 'devParserRSSParseMusicMediumFeeds',
    label: 'Dev: parse music-medium PI feeds to DB',
    description:
      'Podcast Index /podcasts/bymedium?medium=music → parse and save (dev seed; -max to cap).',
    category: 'dev',
    risk: 'dev_only',
    example_cli: 'npm run dev_parser_rss_parse_music_medium_feeds -w apps/workers -- -max 20',
  },
  {
    name: 'devParserRSSParseArtistPublisherFeeds',
    label: 'Dev: parse committed artist publisher-music feeds to DB',
    description:
      'Parse the committed ARTIST_PUBLISHER_FEEDS list by Podcast Index id (dev seed; optional -max prefix, -f force).',
    category: 'dev',
    risk: 'dev_only',
    example_cli: 'npm run workers:parse_artist_publisher_feeds',
  },
  {
    name: 'devDiscoverArtistPublisherFeeds',
    label: 'Dev: discover artist publisher-music PI feeds (rewrite list)',
    description:
      'Maintainer-only crawl: find publisher-music feeds via PI + album RSS walk, rewrite ARTIST_PUBLISHER_FEEDS, then commit.',
    category: 'dev',
    risk: 'dev_only',
    example_cli: 'npm run workers:discover_artist_publisher_feeds -- -max 50',
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
    name: 'podcastIndexDeadFeedsFlagAndMerge',
    label: 'Podcast Index: dead feeds flag and merge',
    description:
      'Download the Podcast Index dead-feed list, record duplicateOf pairs for feeds we store, and retire feeds that list marks when PODCAST_INDEX_DEAD_FEED_RETIRE_MODE is apply.',
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
    name: 'devStatsSeedSimulatedPopularity',
    label: 'Dev: seed simulated Top / trending stats',
    description:
      'Write 31 days of staggered daily listener totals plus one older history day for public channels, a capped set of newest items, and public clips, playlists, and accounts, then refresh popularity range totals and write simulated day, week, and month counts.',
    category: 'dev',
    risk: 'dev_only',
    example_cli: 'npm run workers:seed_simulated_stats',
  },
  {
    name: 'devSeedLocalUserContent',
    label: 'Dev: seed local user content and notifications',
    description:
      'Idempotent local content for dummyNN@podverse.local plus operator login accounts: follows, public AV clips, playlists, and inbox notifications linked to parsed feeds. A publisher channel notice names the new show and the publisher feed. Podcast and video publisher rows are omitted until Podcast Index has those feeds. Re-running replaces the seeded notification rows. Parses a small Podcast Index set when those feeds are missing. Run workers:seed_simulated_stats afterward for Top lists.',
    category: 'dev',
    risk: 'dev_only',
    example_cli: 'npm run workers:seed_local_user_content',
  },
  {
    name: 'statsPopularityRefresh',
    label: 'Stats: refresh popularity range totals',
    description:
      'Rebuild popularity range totals: day, week, and month as distinct listeners from counted events, all-time from daily totals. Hourly runs cover entities active in the last 30 days; -full recomputes every entity.',
    category: 'stats',
    risk: 'normal',
    example_cli: 'npm run stats_popularity_refresh -w apps/workers -- -full',
  },
  {
    name: 'statsEventPartitionsMaintain',
    label: 'Stats: maintain listen event partitions',
    description:
      'Create monthly partitions for popularity listen and open events two months ahead, then drop months whose rows are all older than STATS_TRACK_EVENT_RETENTION_DAYS.',
    category: 'stats',
    risk: 'normal',
    example_cli: 'npm run stats_event_partitions_maintain -w apps/workers',
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
