import archiveAll from '@workers/commands/archiver/archiveAll';
import { ormFeedUpdateFlagStatus } from '@workers/commands/orm/feed/updateFlagStatus';
import { parserRSSParseFeed } from '@workers/commands/parser/rss/parseFeed';
import { podcastIndexDeadFeedsDeleteCache, podcastIndexDeadFeedsFlagAndMerge } from '@workers/commands/podcastIndex/deadFeeds/flagAndMerge';
import podcastIndexTrendingPodcastsGet from '@workers/commands/podcastIndex/trending/podcastsGet';
import { podcastIndexValueUpdateAll } from '@workers/commands/podcastIndex/value/updateAll';
import { mqRSSAdd } from '@workers/commands/mq/rss/add';
import { mqRSSAddAll } from '@workers/commands/mq/rss/addAll';
import { mqRSSRunDlqConsumer } from './mq/rss/dlqHandling';
import { mqRSSRunParser } from '@workers/commands/mq/rss/runParser';
import { mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex } from '@workers/commands/mq/rss/mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex';
import { statsUpdateAggregated } from '@workers/commands/stats/statsUpdateAggregated';
import { statsUpdateAggregatedRolling } from '@workers/commands/stats/statsUpdateAggregatedRolling';
import { mqRSSRunLiveItemListener } from './mq/rss/runLiveItemListener';
import { generateOnDemandParserEventReports } from './orm/onDemandParserEvent/generateOnDemandParserEventReports';
import { deleteOutdatedOnDemandParserEvent } from './orm/onDemandParserEvent/deleteOutdatedOnDemandParserEvent';

export type CommandLineArgs = { [key: string]: string | string[] };

export default {
  archiveAll,
  ormFeedUpdateFlagStatus,
  parserRSSParseFeed,
  podcastIndexDeadFeedsDeleteCache,
  podcastIndexDeadFeedsFlagAndMerge,
  podcastIndexTrendingPodcastsGet,
  podcastIndexValueUpdateAll,
  mqRSSAdd,
  mqRSSAddAll,
  mqRSSRunDlqConsumer,
  mqRSSRunParser,
  mqRSSRunLiveItemListener,
  mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex,
  statsUpdateAggregated,
  statsUpdateAggregatedRolling,
  generateOnDemandParserEventReports,
  deleteOutdatedOnDemandParserEvent,
} as { [key: string]: (args: CommandLineArgs) => void };
