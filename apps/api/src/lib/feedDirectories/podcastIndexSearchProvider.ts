import { config } from '@api/config/index.js';
import { podcastIndexService } from '@api/factories/podcastIndexService.js';

import type { PodcastIndexSearchPodcastsResponse, SearchPodcastsFeed } from '@podverse/helpers';
import { getMediumIdArrayFromType, MediumEnum } from '@podverse/helpers';
import { AppDataSourceRead, Channel } from '@podverse/orm';

import {
  buildE2eUnparsedSearchResponse,
  isE2eUnparsedSearchQuery,
} from './e2eUnparsedSearchFixture.js';
import type { FeedDirectorySearchParams, FeedDirectorySearchProvider } from './types.js';

const EMPTY_FUNDING = { url: '', message: '' };

const mediumLabelForChannel = (mediumId: number): string => {
  if (mediumId === MediumEnum.Music || mediumId === MediumEnum.PublisherMusic) {
    return 'music';
  }
  return 'podcast';
};

const toSearchFeed = (channel: Channel): SearchPodcastsFeed | null => {
  const podcastIndexId = channel.feed?.podcast_index_id;
  if (podcastIndexId === undefined || podcastIndexId === null) {
    return null;
  }

  const imageUrl = channel.channel_images?.[0]?.url ?? '';
  const title = channel.title ?? channel.feed?.url ?? '';

  return {
    id: podcastIndexId,
    title,
    url: channel.feed?.url ?? '',
    originalUrl: channel.feed?.url ?? '',
    link: '',
    description: '',
    author: '',
    ownerName: '',
    image: imageUrl,
    artwork: imageUrl,
    lastUpdateTime: 0,
    lastCrawlTime: 0,
    lastParseTime: 0,
    inPollingQueue: 0,
    priority: 0,
    lastGoodHttpStatusTime: 0,
    lastHttpStatus: 200,
    contentType: 'application/rss+xml',
    itunesId: 0,
    generator: '',
    language: 'en',
    type: 0,
    dead: 0,
    crawlErrors: 0,
    parseErrors: 0,
    categories: {},
    locked: 0,
    explicit: false,
    podcastGuid: '',
    medium: mediumLabelForChannel(channel.medium_id),
    episodeCount: 0,
    imageUrlHash: 0,
    newestItemPubdate: 0,
    funding: EMPTY_FUNDING,
  };
};

/**
 * Local DB search used when E2E fixtures are enabled (no Podcast Index network).
 * Do not import `typeorm` FindOperators — apps/api does not declare typeorm; use QueryBuilder.
 */
const searchLocalChannels = async (
  params: FeedDirectorySearchParams
): Promise<PodcastIndexSearchPodcastsResponse> => {
  const mediumParam = params.medium === 'music' ? 'music' : 'podcasts';
  const mediumIds = getMediumIdArrayFromType(mediumParam);
  const trimmedQuery = params.q.trim();
  const take = config.podcastIndex.searchMax;

  const qb = AppDataSourceRead.getRepository(Channel)
    .createQueryBuilder('channel')
    .innerJoinAndSelect('channel.channel_about', 'channel_about')
    .innerJoinAndSelect('channel.feed', 'feed')
    .leftJoinAndSelect('channel.channel_images', 'channel_images')
    .innerJoin('feed.feed_policy', 'feed_policy')
    .where('feed_policy.public_visible = :publicVisible', { publicVisible: true })
    .andWhere('feed.podcast_index_id IS NOT NULL')
    .orderBy('channel.title', 'ASC')
    .take(take);

  if (trimmedQuery.length > 0) {
    qb.andWhere('channel.title ILIKE :q', { q: `%${trimmedQuery}%` });
  }

  if (mediumIds !== null) {
    qb.andWhere('channel.medium_id IN (:...mediumIds)', { mediumIds });
  }

  const channels = await qb.getMany();

  const feeds = channels
    .map((channel) => toSearchFeed(channel))
    .filter((feed): feed is SearchPodcastsFeed => feed !== null);

  return {
    status: 'true',
    feeds,
    count: feeds.length,
    query: params.q,
    description: 'Found matching feeds.',
  };
};

export const podcastIndexSearchProvider: FeedDirectorySearchProvider = {
  directoryId: 'podcast-index',

  async search(params: FeedDirectorySearchParams) {
    if (config.e2e.fixturesEnabled) {
      if (isE2eUnparsedSearchQuery(params.q)) {
        return buildE2eUnparsedSearchResponse(params.q);
      }
      return searchLocalChannels(params);
    }

    const options = { max: config.podcastIndex.searchMax };

    if (params.medium === 'music') {
      return podcastIndexService.searchMusicByTerm(params.q, options);
    }

    return podcastIndexService.searchPodcasts(params.q, options);
  },
};
