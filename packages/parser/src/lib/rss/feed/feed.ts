import { timerManager } from '@parser/factories/timerManager.js';
import type { FeedObject } from 'podverse-partytime';

import { getStatusCodeFromError, throwRequestError } from '@podverse/helpers-requests';
import type { Feed } from '@podverse/orm';
import { FeedLogService, FeedService } from '@podverse/orm';

import { getParserConfig } from '../../../context.js';
import { FeedIsParsingError, FeedNoChangesSinceLastParsedError } from '../errors.js';
import { getParsedFeedMd5Hash } from '../hash/parsedFeed.js';
import { getAndParseRSSFeed } from '../parser.js';

export const handleGetRSSFeed = async (url: string, podcast_index_id: number): Promise<Feed> => {
  timerManager.start('handleGetRSSFeed');

  const feedService = new FeedService();
  let feed: Feed | null;

  if (getParserConfig().testAssetsMode) {
    feed = await feedService.getByPodcastIndexId(podcast_index_id);
    if (!feed) {
      const maxId = await feedService.getMaxPodcastIndexId();
      const newPodcastIndexId = maxId === null ? 1 : maxId + 1;
      feed = await feedService.getOrCreate({ url, podcast_index_id: newPodcastIndexId });
    }
  } else {
    feed = await feedService.getByUrlAndPodcastIndexId({
      url,
      podcast_index_id,
    });

    if (!feed) {
      feed = await feedService.getByPodcastIndexId(podcast_index_id);
    }

    if (!feed) {
      feed = await feedService.getOrCreate({ url, podcast_index_id });
    }
  }

  timerManager.end('handleGetRSSFeed');

  if (!feed) {
    throw new Error(`parseRSSFeedAndSaveToDatabase: feed not found for ${url}`);
  }

  return feed;
};

export const handleRequestRSSFeed = async (
  feed: Feed,
  maxFeedBodyBytes: number
): Promise<FeedObject> => {
  timerManager.start('handleRequestRSSFeed');
  const feedLogService = new FeedLogService();
  let parsedFeed: FeedObject | null;

  try {
    parsedFeed = await getAndParseRSSFeed(feed.url, maxFeedBodyBytes);
    await feedLogService.update(feed, {
      last_http_status: 200,
      last_good_http_status_time: new Date(),
    });
  } catch (error) {
    const statusCode = getStatusCodeFromError(error);
    const feedLog = await feedLogService.get(feed);
    await feedLogService.update(feed, {
      ...(statusCode ? { last_http_status: statusCode } : {}),
      parse_errors: (feedLog?.parse_errors || 0) + 1,
    });
    return throwRequestError(error);
  }

  if (!parsedFeed) {
    const feedLog = await feedLogService.get(feed);
    await feedLogService.update(feed, {
      last_http_status: 200,
      last_finished_parse_time: new Date(),
      parse_errors: (feedLog?.parse_errors || 0) + 1,
    });
    return throwRequestError('parsedFeed no data found');
  }

  timerManager.end('handleRequestRSSFeed');

  return parsedFeed;
};

type HandleParsedFeedOptions = {
  forceParse?: boolean;
};

export const handleParsedFeed = async (
  parsedFeed: FeedObject,
  feed: Feed,
  options: HandleParsedFeedOptions = {}
): Promise<Feed> => {
  const currentFeedFileHash = getParsedFeedMd5Hash(parsedFeed);

  checkIfFeedIsParsing(feed);
  if (!options.forceParse && feed.last_parsed_file_hash === currentFeedFileHash) {
    throw new FeedNoChangesSinceLastParsedError(feed.id);
  }

  const feedService = new FeedService();
  return feedService.update(feed.id, { last_parsed_file_hash: null });
};

const checkIfFeedIsParsing = (feed: Feed): void => {
  if (feed.is_parsing) {
    const parsingDate = new Date(feed.is_parsing);
    const currentDate = new Date();
    const timeDifference = (currentDate.getTime() - parsingDate.getTime()) / (1000 * 60);

    if (timeDifference <= 15) {
      throw new FeedIsParsingError(feed.id);
    }
  }
};
