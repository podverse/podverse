import archiveAll from '@workers/commands/archiver/archiveAll.js';
import { devSeedLocalUserContent } from '@workers/commands/dev/devSeedLocalUserContent.js';
import { seedEmbedDemoShowcaseFeeds } from '@workers/commands/embedDemo/seedShowcaseFeeds.js';
import { mqRSSAdd } from '@workers/commands/mq/rss/add.js';
import { mqRSSAddAll } from '@workers/commands/mq/rss/addAll.js';
import { devPiBulkFeedsAddFromFile } from '@workers/commands/mq/rss/devPiBulkFeedsAddFromFile.js';
import { mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex } from '@workers/commands/mq/rss/mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex.js';
import { mqRSSAddTrendingPodcastsFromPodcastIndex } from '@workers/commands/mq/rss/mqRSSAddTrendingPodcastsFromPodcastIndex.js';
import { mqAddByRSSRunParser } from '@workers/commands/mq/rss/runAddByRSSParser.js';
import { mqOpmlImportRun } from '@workers/commands/mq/rss/runOpmlImport.js';
import { mqRSSRunParser } from '@workers/commands/mq/rss/runParser.js';
import { devDiscoverArtistPublisherFeeds } from '@workers/commands/parser/rss/discoverArtistPublisherFeeds.js';
import { devParserRSSParseArtistPublisherFeeds } from '@workers/commands/parser/rss/parseArtistPublisherFeeds.js';
import { parserRSSParseFeed } from '@workers/commands/parser/rss/parseFeed.js';
import { devParserRSSParseMusicMediumFeeds } from '@workers/commands/parser/rss/parseMusicMediumFeeds.js';
import { devParserRSSParsePodcasting20Feeds } from '@workers/commands/parser/rss/parsePodcasting20Feeds.js';
import { devParserRSSParseTrendingFeeds } from '@workers/commands/parser/rss/parseTrendingFeeds.js';
import { podcastIndexDeadFeedsFlagAndMerge } from '@workers/commands/podcastIndex/deadFeeds/flagAndMerge.js';
import podcastIndexTrendingPodcastsGet from '@workers/commands/podcastIndex/trending/podcastsGet.js';
import { podcastIndexValueUpdateAll } from '@workers/commands/podcastIndex/value/updateAll.js';
import { devStatsSeedSimulatedPopularity } from '@workers/commands/stats/devStatsSeedSimulatedPopularity.js';
import { statsEventPartitionsMaintain } from '@workers/commands/stats/statsEventPartitionsMaintain.js';
import { statsPopularityRefresh } from '@workers/commands/stats/statsPopularityRefresh.js';
import { statsRecommendationsRefresh } from '@workers/commands/stats/statsRecommendationsRefresh.js';

import { billingCheckoutChannelEnable } from './billing/checkoutChannelEnable.js';
import { billingStrikeEnsureWebhook } from './billing/ensureStrikeWebhook.js';
import { billingImportLegacyMembershipExpiry } from './billing/importLegacyMembershipExpiry.js';
import { billingProcessorProductAdd } from './billing/processorProductAdd.js';
import { billingReconcile } from './billing/reconcile.js';
import { imageShrinkBackfill } from './imageShrink/backfill.js';
import { imageShrinkCleanupOrphans } from './imageShrink/cleanupOrphans.js';
import { imageShrinkSourcePrune } from './imageShrink/pruneSources.js';
import {
  imageShrinkResetShrunken,
  imageShrinkResetShrunkenDryRun,
} from './imageShrink/resetShrunken.js';
import { imageShrinkRunConsumer } from './imageShrink/runConsumer.js';
import { mqRSSRunDlqConsumer } from './mq/rss/dlqHandling.js';
import { mqRSSRunLiveItemListener } from './mq/rss/runLiveItemListener.js';
import { accountContentLogPurge } from './orm/accountContentLog/purge.js';
import { accountSessionPurge } from './orm/accountSession/purge.js';
import { ormArchivedSlimReport } from './orm/archivedSlimming/report.js';
import { notificationsTestPush } from './orm/notifications/notificationsTestPush.js';
import { notificationsPlatformPurge } from './orm/notifications/platformPurge.js';
import { deleteOutdatedOnDemandParserEvent } from './orm/onDemandParserEvent/deleteOutdatedOnDemandParserEvent.js';
import { generateOnDemandParserEventReports } from './orm/onDemandParserEvent/generateOnDemandParserEventReports.js';
import { scheduledJobsRunDue } from './orm/scheduledJob/runDue.js';
import { ormVerifiedPublisherLinksBackfill } from './orm/verifiedPublisherLinks/backfill.js';

export type CommandLineArgs = { [key: string]: string | string[] };

export default {
  archiveAll,
  parserRSSParseFeed,
  devDiscoverArtistPublisherFeeds,
  devParserRSSParseArtistPublisherFeeds,
  devParserRSSParseMusicMediumFeeds,
  devParserRSSParsePodcasting20Feeds,
  devParserRSSParseTrendingFeeds,
  seedEmbedDemoShowcaseFeeds,
  podcastIndexDeadFeedsFlagAndMerge,
  podcastIndexTrendingPodcastsGet,
  podcastIndexValueUpdateAll,
  mqRSSAdd,
  mqRSSAddAll,
  mqRSSRunDlqConsumer,
  mqRSSRunParser,
  mqAddByRSSRunParser,
  mqOpmlImportRun,
  mqRSSRunLiveItemListener,
  devPiBulkFeedsAddFromFile,
  mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex,
  mqRSSAddTrendingPodcastsFromPodcastIndex,
  devSeedLocalUserContent,
  devStatsSeedSimulatedPopularity,
  statsEventPartitionsMaintain,
  statsPopularityRefresh,
  statsRecommendationsRefresh,
  billingCheckoutChannelEnable,
  billingImportLegacyMembershipExpiry,
  billingProcessorProductAdd,
  billingReconcile,
  billingStrikeEnsureWebhook,
  scheduledJobsRunDue,
  ormArchivedSlimReport,
  ormVerifiedPublisherLinksBackfill,
  notificationsPlatformPurge,
  notificationsTestPush,
  accountContentLogPurge,
  accountSessionPurge,
  generateOnDemandParserEventReports,
  deleteOutdatedOnDemandParserEvent,
  imageShrinkBackfill,
  imageShrinkCleanupOrphans,
  imageShrinkResetShrunken,
  imageShrinkResetShrunkenDryRun,
  imageShrinkRunConsumer,
  imageShrinkSourcePrune,
} as { [key: string]: (args: CommandLineArgs) => void };
