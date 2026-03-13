import archiveAll from '@workers/commands/archiver/archiveAll.js';
import { ormFeedUpdateFlagStatus } from '@workers/commands/orm/feed/updateFlagStatus.js';
import { reencryptAddByRSSCredentials } from '@workers/commands/orm/addByRSS/reencryptCredentials.js';
import { parserRSSParseFeed } from '@workers/commands/parser/rss/parseFeed.js';
import {
  podcastIndexDeadFeedsDeleteCache,
  podcastIndexDeadFeedsFlagAndMerge,
} from '@workers/commands/podcastIndex/deadFeeds/flagAndMerge.js';
import podcastIndexTrendingPodcastsGet from '@workers/commands/podcastIndex/trending/podcastsGet.js';
import { podcastIndexValueUpdateAll } from '@workers/commands/podcastIndex/value/updateAll.js';
import { mqRSSAdd } from '@workers/commands/mq/rss/add.js';
import { mqRSSAddAll } from '@workers/commands/mq/rss/addAll.js';
import { mqRSSRunDlqConsumer } from './mq/rss/dlqHandling.js';
import { mqRSSRunParser } from '@workers/commands/mq/rss/runParser.js';
import { mqAddByRSSRunParser } from '@workers/commands/mq/rss/runAddByRSSParser.js';
import { devPiBulkFeedsAddFromFile } from '@workers/commands/mq/rss/devPiBulkFeedsAddFromFile.js';
import { mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex } from '@workers/commands/mq/rss/mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex.js';
import { statsUpdateAggregated } from '@workers/commands/stats/statsUpdateAggregated.js';
import { statsUpdateAggregatedRolling } from '@workers/commands/stats/statsUpdateAggregatedRolling.js';
import { mqRSSRunLiveItemListener } from './mq/rss/runLiveItemListener.js';
import { generateOnDemandParserEventReports } from './orm/onDemandParserEvent/generateOnDemandParserEventReports.js';
import { deleteOutdatedOnDemandParserEvent } from './orm/onDemandParserEvent/deleteOutdatedOnDemandParserEvent.js';
import { imageShrinkBackfill } from './imageShrink/backfill.js';
import { imageShrinkCleanupOrphans } from './imageShrink/cleanupOrphans.js';
import { imageShrinkRunConsumer } from './imageShrink/runConsumer.js';
import { imageShrinkSourcePrune } from './imageShrink/pruneSources.js';

export type CommandLineArgs = { [key: string]: string | string[] };

export default {
  archiveAll,
  ormFeedUpdateFlagStatus,
  reencryptAddByRSSCredentials,
  parserRSSParseFeed,
  podcastIndexDeadFeedsDeleteCache,
  podcastIndexDeadFeedsFlagAndMerge,
  podcastIndexTrendingPodcastsGet,
  podcastIndexValueUpdateAll,
  mqRSSAdd,
  mqRSSAddAll,
  mqRSSRunDlqConsumer,
  mqRSSRunParser,
  mqAddByRSSRunParser,
  mqRSSRunLiveItemListener,
  devPiBulkFeedsAddFromFile,
  mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex,
  statsUpdateAggregated,
  statsUpdateAggregatedRolling,
  generateOnDemandParserEventReports,
  deleteOutdatedOnDemandParserEvent,
  imageShrinkBackfill,
  imageShrinkCleanupOrphans,
  imageShrinkRunConsumer,
  imageShrinkSourcePrune,
} as { [key: string]: (args: CommandLineArgs) => void };
