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

export type ConfigCategory =
  | typeof CATEGORY_BASE
  | typeof CATEGORY_ORM
  | typeof CATEGORY_MQ
  | typeof CATEGORY_PARSER
  | typeof CATEGORY_PODCAST_INDEX
  | typeof CATEGORY_WEB_NOTIFICATIONS
  | typeof CATEGORY_KEYVALDB;

const BASE_ORM_COMMANDS = [
  'archiveAll',
  'ormFeedUpdateFlagStatus',
  'reencryptAddByRSSCredentials',
  'statsUpdateAggregated',
  'statsUpdateAggregatedRolling',
  'generateOnDemandParserEventReports',
  'deleteOutdatedOnDemandParserEvent',
] as const;

const BASE_ONLY_COMMANDS = ['podcastIndexDeadFeedsDeleteCache'] as const;

const BASE_PODCAST_INDEX_COMMANDS = [
  'podcastIndexTrendingPodcastsGet',
  'podcastIndexValueUpdateAll',
] as const;

const BASE_ORM_PODCAST_INDEX_COMMANDS = ['podcastIndexDeadFeedsFlagAndMerge'] as const;

const BASE_ORM_MQ_PODCAST_INDEX_COMMANDS = ['mqRSSAdd'] as const;

const BASE_ORM_MQ_COMMANDS = ['mqRSSRunDlqConsumer', 'mqRSSAddAll'] as const;

const BASE_ORM_PARSER_PODCAST_INDEX_COMMANDS = ['parserRSSParseFeed'] as const;

const FULL_STACK_COMMANDS = [
  'mqRSSRunParser',
  'mqRSSRunLiveItemListener',
  'mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex',
] as const;

const BASE_ORM_MQ_PARSER_KEYVALDB_COMMANDS = ['mqAddByRSSRunParser'] as const;

/**
 * Returns the set of config categories required for the given command.
 * Used by validation (to validate only those env vars) and index (to build
 * only those configs and create only those contexts).
 */
export function getCategoriesForCommand(commandName: string): Set<ConfigCategory> {
  const categories = new Set<ConfigCategory>();
  categories.add(CATEGORY_BASE);

  if (BASE_ORM_COMMANDS.includes(commandName as (typeof BASE_ORM_COMMANDS)[number])) {
    categories.add(CATEGORY_ORM);
    return categories;
  }

  if (BASE_ONLY_COMMANDS.includes(commandName as (typeof BASE_ONLY_COMMANDS)[number])) {
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
    BASE_ORM_MQ_PARSER_KEYVALDB_COMMANDS.includes(
      commandName as (typeof BASE_ORM_MQ_PARSER_KEYVALDB_COMMANDS)[number]
    )
  ) {
    categories.add(CATEGORY_ORM);
    categories.add(CATEGORY_MQ);
    categories.add(CATEGORY_PARSER);
    categories.add(CATEGORY_KEYVALDB);
    return categories;
  }

  return categories;
}
