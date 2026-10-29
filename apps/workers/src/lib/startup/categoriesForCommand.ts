/**
 * Command → categories mapping. Shared by validation and index so only the
 * config and contexts for the running command's categories are read/created.
 * Do not import config or command implementations here.
 */

export const CATEGORY_BASE = 'Base';
export const CATEGORY_ORM = 'ORM';
export const CATEGORY_MQ = 'MQ';
export const CATEGORY_PARSER = 'Parser';
export const CATEGORY_PODCAST_INDEX = 'PodcastIndex';
export const CATEGORY_WEB_NOTIFICATIONS = 'WebNotifications';
export const CATEGORY_KEYVALDB = 'KeyValDB';
export const CATEGORY_IMAGE_SHRINK = 'ImageShrink';
/** Payment processor adapters, registered once at startup. */
export const CATEGORY_BILLING = 'Billing';

export type ConfigCategory =
  | typeof CATEGORY_BASE
  | typeof CATEGORY_ORM
  | typeof CATEGORY_MQ
  | typeof CATEGORY_PARSER
  | typeof CATEGORY_PODCAST_INDEX
  | typeof CATEGORY_WEB_NOTIFICATIONS
  | typeof CATEGORY_KEYVALDB
  | typeof CATEGORY_IMAGE_SHRINK
  | typeof CATEGORY_BILLING;

const BASE_ORM_COMMANDS = [
  'billingCheckoutChannelEnable',
  'billingImportLegacyMembershipExpiry',
  'billingProcessorProductAdd',
  'notificationsPlatformPurge',
  'accountContentLogPurge',
  'accountSessionPurge',
  'archiveAll',
  'devStatsSeedSimulatedPopularity',
  'statsEventPartitionsMaintain',
  'statsPopularityRefresh',
  'statsRecommendationsRefresh',
  'generateOnDemandParserEventReports',
  'deleteOutdatedOnDemandParserEvent',
  'ormArchivedSlimReport',
  'ormVerifiedPublisherLinksBackfill',
] as const;

const BASE_ORM_BILLING_COMMANDS = ['billingReconcile', 'billingStrikeEnsureWebhook'] as const;

/** Loads Firebase and VAPID with the database. Does not load the parser. */
const BASE_ORM_WEB_NOTIFICATIONS_COMMANDS = ['notificationsTestPush'] as const;

const BASE_PODCAST_INDEX_COMMANDS = [
  'podcastIndexTrendingPodcastsGet',
  'podcastIndexValueUpdateAll',
  'devDiscoverArtistPublisherFeeds',
] as const;

const BASE_ORM_PODCAST_INDEX_COMMANDS = ['podcastIndexDeadFeedsFlagAndMerge'] as const;

const BASE_ORM_MQ_PODCAST_INDEX_COMMANDS = [
  'mqRSSAdd',
  'mqRSSAddTrendingPodcastsFromPodcastIndex',
] as const;

const BASE_ORM_MQ_COMMANDS = ['mqRSSRunDlqConsumer', 'mqRSSAddAll'] as const;

const BASE_MQ_COMMANDS = ['devPiBulkFeedsAddFromFile'] as const;

const BASE_ORM_MQ_IMAGE_SHRINK_COMMANDS = [
  'imageShrinkBackfill',
  'imageShrinkRunConsumer',
] as const;

const BASE_ORM_IMAGE_SHRINK_COMMANDS = [
  'imageShrinkCleanupOrphans',
  'imageShrinkResetShrunken',
  'imageShrinkResetShrunkenDryRun',
  'imageShrinkSourcePrune',
] as const;

/** `scheduledJobsRunDue` is here because the feed-force-reparse job parses a feed. */
const BASE_ORM_PARSER_PODCAST_INDEX_COMMANDS = [
  'parserRSSParseFeed',
  'scheduledJobsRunDue',
  'devParserRSSParseArtistPublisherFeeds',
  'devParserRSSParseMusicMediumFeeds',
  'devParserRSSParsePodcasting20Feeds',
  'devParserRSSParseTrendingFeeds',
  'devSeedLocalUserContent',
  'seedEmbedDemoShowcaseFeeds',
] as const;

const FULL_STACK_COMMANDS = [
  'mqRSSRunParser',
  'mqRSSRunLiveItemListener',
  'mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex',
] as const;

/** `mqAddByRSSRunParser` looks up feed URLs an Add by RSS artist feed lists without one. */
const BASE_ORM_MQ_PARSER_KEYVALDB_PODCAST_INDEX_COMMANDS = ['mqAddByRSSRunParser'] as const;

const BASE_ORM_MQ_KEYVALDB_PODCAST_INDEX_COMMANDS = ['mqOpmlImportRun'] as const;

/** Commands that write account notifications and so publish account events through Redis. */
export const ACCOUNT_NOTIFICATION_WRITER_COMMANDS = [
  'mqRSSRunParser',
  'parserRSSParseFeed',
  'scheduledJobsRunDue',
  'devParserRSSParseArtistPublisherFeeds',
  'devParserRSSParseMusicMediumFeeds',
  'devParserRSSParsePodcasting20Feeds',
  'devParserRSSParseTrendingFeeds',
  'devSeedLocalUserContent',
  'seedEmbedDemoShowcaseFeeds',
] as const;

/** Commands that read and write the KeyValDB cache and need it reachable at startup. */
export const KEYVALDB_CACHE_COMMANDS = ['mqAddByRSSRunParser', 'mqOpmlImportRun'] as const;

const accountNotificationWriterCommands: ReadonlySet<string> = new Set<string>(
  ACCOUNT_NOTIFICATION_WRITER_COMMANDS
);

const keyvaldbCacheCommands: ReadonlySet<string> = new Set<string>(KEYVALDB_CACHE_COMMANDS);

export function writesAccountNotifications(commandName: string): boolean {
  return accountNotificationWriterCommands.has(commandName);
}

export function usesKeyvaldbCache(commandName: string): boolean {
  return keyvaldbCacheCommands.has(commandName);
}

function getBaseCategoriesForCommand(commandName: string): Set<ConfigCategory> {
  const categories = new Set<ConfigCategory>();
  categories.add(CATEGORY_BASE);

  if (BASE_ORM_COMMANDS.includes(commandName as (typeof BASE_ORM_COMMANDS)[number])) {
    categories.add(CATEGORY_ORM);
    return categories;
  }

  if (
    BASE_ORM_WEB_NOTIFICATIONS_COMMANDS.includes(
      commandName as (typeof BASE_ORM_WEB_NOTIFICATIONS_COMMANDS)[number]
    )
  ) {
    categories.add(CATEGORY_ORM);
    categories.add(CATEGORY_WEB_NOTIFICATIONS);
    return categories;
  }

  if (
    BASE_ORM_BILLING_COMMANDS.includes(commandName as (typeof BASE_ORM_BILLING_COMMANDS)[number])
  ) {
    categories.add(CATEGORY_ORM);
    categories.add(CATEGORY_BILLING);
    return categories;
  }

  if (
    BASE_PODCAST_INDEX_COMMANDS.includes(
      commandName as (typeof BASE_PODCAST_INDEX_COMMANDS)[number]
    )
  ) {
    categories.add(CATEGORY_PODCAST_INDEX);
    return categories;
  }

  if (
    BASE_ORM_PODCAST_INDEX_COMMANDS.includes(
      commandName as (typeof BASE_ORM_PODCAST_INDEX_COMMANDS)[number]
    )
  ) {
    categories.add(CATEGORY_ORM);
    categories.add(CATEGORY_PODCAST_INDEX);
    return categories;
  }

  if (
    BASE_ORM_MQ_PODCAST_INDEX_COMMANDS.includes(
      commandName as (typeof BASE_ORM_MQ_PODCAST_INDEX_COMMANDS)[number]
    )
  ) {
    categories.add(CATEGORY_ORM);
    categories.add(CATEGORY_MQ);
    categories.add(CATEGORY_PODCAST_INDEX);
    return categories;
  }

  if (BASE_ORM_MQ_COMMANDS.includes(commandName as (typeof BASE_ORM_MQ_COMMANDS)[number])) {
    categories.add(CATEGORY_ORM);
    categories.add(CATEGORY_MQ);
    return categories;
  }

  if (BASE_MQ_COMMANDS.includes(commandName as (typeof BASE_MQ_COMMANDS)[number])) {
    categories.add(CATEGORY_MQ);
    return categories;
  }

  if (
    BASE_ORM_MQ_IMAGE_SHRINK_COMMANDS.includes(
      commandName as (typeof BASE_ORM_MQ_IMAGE_SHRINK_COMMANDS)[number]
    )
  ) {
    categories.add(CATEGORY_ORM);
    categories.add(CATEGORY_MQ);
    categories.add(CATEGORY_IMAGE_SHRINK);
    return categories;
  }

  if (
    BASE_ORM_IMAGE_SHRINK_COMMANDS.includes(
      commandName as (typeof BASE_ORM_IMAGE_SHRINK_COMMANDS)[number]
    )
  ) {
    categories.add(CATEGORY_ORM);
    categories.add(CATEGORY_IMAGE_SHRINK);
    return categories;
  }

  if (
    BASE_ORM_PARSER_PODCAST_INDEX_COMMANDS.includes(
      commandName as (typeof BASE_ORM_PARSER_PODCAST_INDEX_COMMANDS)[number]
    )
  ) {
    categories.add(CATEGORY_ORM);
    categories.add(CATEGORY_MQ);
    categories.add(CATEGORY_PARSER);
    categories.add(CATEGORY_PODCAST_INDEX);
    categories.add(CATEGORY_WEB_NOTIFICATIONS);
    return categories;
  }

  if (FULL_STACK_COMMANDS.includes(commandName as (typeof FULL_STACK_COMMANDS)[number])) {
    categories.add(CATEGORY_ORM);
    categories.add(CATEGORY_MQ);
    categories.add(CATEGORY_PARSER);
    categories.add(CATEGORY_PODCAST_INDEX);
    categories.add(CATEGORY_WEB_NOTIFICATIONS);
    return categories;
  }

  if (
    BASE_ORM_MQ_PARSER_KEYVALDB_PODCAST_INDEX_COMMANDS.includes(
      commandName as (typeof BASE_ORM_MQ_PARSER_KEYVALDB_PODCAST_INDEX_COMMANDS)[number]
    )
  ) {
    categories.add(CATEGORY_ORM);
    categories.add(CATEGORY_MQ);
    categories.add(CATEGORY_PARSER);
    categories.add(CATEGORY_KEYVALDB);
    categories.add(CATEGORY_PODCAST_INDEX);
    return categories;
  }

  if (
    BASE_ORM_MQ_KEYVALDB_PODCAST_INDEX_COMMANDS.includes(
      commandName as (typeof BASE_ORM_MQ_KEYVALDB_PODCAST_INDEX_COMMANDS)[number]
    )
  ) {
    categories.add(CATEGORY_ORM);
    categories.add(CATEGORY_MQ);
    categories.add(CATEGORY_KEYVALDB);
    categories.add(CATEGORY_PODCAST_INDEX);
    return categories;
  }

  return categories;
}

/**
 * Returns the set of config categories required for the given command.
 * Used by validation (to validate only those env vars) and index (to build
 * only those configs and create only those contexts).
 */
export function getCategoriesForCommand(commandName: string): Set<ConfigCategory> {
  const categories = getBaseCategoriesForCommand(commandName);
  if (writesAccountNotifications(commandName)) {
    categories.add(CATEGORY_KEYVALDB);
  }
  return categories;
}
