/**
 * List of known worker command names. Used for command-first bootstrap so we can
 * resolve the command from argv and run per-job validation before loading config or commands.
 * Do not import config or command implementations here.
 */
export const KNOWN_COMMANDS: readonly string[] = [
  'archiveAll',
  'deleteOutdatedOnDemandParserEvent',
  'generateOnDemandParserEventReports',
  'mqImageShrinkBackfill',
  'mqImageShrinkRunConsumer',
  'mqRSSAdd',
  'mqRSSAddAll',
  'mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex',
  'mqRSSRunDlqConsumer',
  'mqRSSRunLiveItemListener',
  'mqRSSRunParser',
  'mqAddByRSSRunParser',
  'ormFeedUpdateFlagStatus',
  'reencryptAddByRSSCredentials',
  'parserRSSParseFeed',
  'podcastIndexDeadFeedsDeleteCache',
  'podcastIndexDeadFeedsFlagAndMerge',
  'podcastIndexTrendingPodcastsGet',
  'podcastIndexValueUpdateAll',
  'statsUpdateAggregated',
  'statsUpdateAggregatedRolling',
] as const;

export type KnownCommandName = (typeof KNOWN_COMMANDS)[number];
