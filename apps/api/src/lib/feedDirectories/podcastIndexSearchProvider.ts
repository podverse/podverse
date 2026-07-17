import { config } from '@api/config/index.js';
import { podcastIndexService } from '@api/factories/podcastIndexService.js';
import { ILike, In, IsNull, Not } from 'typeorm';

import type { PodcastIndexSearchPodcastsResponse, SearchPodcastsFeed } from '@podverse/helpers';
import { getMediumIdArrayFromType, MediumEnum } from '@podverse/helpers';
import { AppDataSourceRead, Channel } from '@podverse/orm';

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

const searchLocalChannels = async (
  params: FeedDirectorySearchParams
): Promise<PodcastIndexSearchPodcastsResponse> => {
  const mediumParam = params.medium === 'music' ? 'music' : 'podcasts';
  const mediumIds = getMediumIdArrayFromType(mediumParam);
  const trimmedQuery = params.q.trim();
  const take = config.podcastIndex.searchMax;

  const channels = await AppDataSourceRead.getRepository(Channel).find({
    where: {
      ...(trimmedQuery.length > 0 ? { title: ILike(`%${trimmedQuery}%`) } : {}),
      ...(mediumIds !== null ? { medium_id: In(mediumIds) } : {}),
      channel_about: {
        id: Not(IsNull()),
      },
      feed: {
        podcast_index_id: Not(IsNull()),
        feed_policy: {
          public_visible: true,
        },
      },
    },
    relations: {
      feed: true,
      channel_images: true,
    },
    take,
    order: {
      title: 'ASC',
    },
  });

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
      return searchLocalChannels(params);
    }

    const options = { max: config.podcastIndex.searchMax };

    if (params.medium === 'music') {
      return podcastIndexService.searchMusicByTerm(params.q, options);
    }

    return podcastIndexService.searchPodcasts(params.q, options);
  },
};
