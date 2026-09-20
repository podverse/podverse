import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  channelItemsRepository,
  channelLiveStatusRepository,
  channelSeenRepository,
  downloadsRepository,
  homeClipsCacheRepository,
  subscriptionsRepository,
  syncEventLogRepository,
} from '../../data/repositories';
import type { SubscribedChannel } from '../../data/repositories';
import { fetchHomeFeedRows } from './homeFeedData';
import { HOME_FEED_METADATA_TIMEOUT_CODE, HOME_FEED_METADATA_TIMEOUT_MS } from './homeFeedReadLog';

vi.mock('../../data/repositories', () => ({
  channelItemsRepository: {
    listSubscribed: vi.fn(),
    hasPopularityRanks: vi.fn(),
    refreshPopularityRanks: vi.fn(),
  },
  channelLiveStatusRepository: {
    listBroadcastingKeys: vi.fn(),
  },
  channelSeenRepository: {
    listUnseen: vi.fn(),
  },
  downloadsRepository: {
    countCompletedByChannel: vi.fn(),
  },
  homeClipsCacheRepository: {
    listPayload: vi.fn(),
  },
  subscriptionsRepository: {
    hasPopularityRanks: vi.fn(),
    list: vi.fn(),
    refreshPopularityRanks: vi.fn(),
  },
  syncEventLogRepository: {
    append: vi.fn(),
  },
}));

const followedShow = (): SubscribedChannel => ({
  idText: 'show-1',
  imageUrl: null,
  kind: 'podcasts',
  latestItemPubDateMs: null,
  medium: 'podcasts',
  popularityRank: null,
  source: 'directory',
  title: 'Example Show',
});

describe('fetchHomeFeedRows local paint', () => {
  beforeEach(() => {
    vi.mocked(subscriptionsRepository.list).mockReset();
    vi.mocked(subscriptionsRepository.hasPopularityRanks).mockReset();
    vi.mocked(subscriptionsRepository.refreshPopularityRanks).mockReset();
    vi.mocked(channelItemsRepository.listSubscribed).mockReset();
    vi.mocked(channelItemsRepository.hasPopularityRanks).mockReset();
    vi.mocked(channelItemsRepository.refreshPopularityRanks).mockReset();
    vi.mocked(channelLiveStatusRepository.listBroadcastingKeys).mockReset();
    vi.mocked(channelSeenRepository.listUnseen).mockReset();
    vi.mocked(downloadsRepository.countCompletedByChannel).mockReset();
    vi.mocked(homeClipsCacheRepository.listPayload).mockReset();
    vi.mocked(syncEventLogRepository.append).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('paints podcasts from the follow list and never asks the directory for ranks', async () => {
    vi.mocked(subscriptionsRepository.list).mockResolvedValue([followedShow()]);
    vi.mocked(channelLiveStatusRepository.listBroadcastingKeys).mockResolvedValue([]);
    vi.mocked(downloadsRepository.countCompletedByChannel).mockResolvedValue(new Map());
    vi.mocked(channelSeenRepository.listUnseen).mockResolvedValue([]);

    const rows = await fetchHomeFeedRows('podcasts', { sort: 'popularity' });

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'show-1',
        title: 'Example Show',
      }),
    ]);
    expect(subscriptionsRepository.hasPopularityRanks).not.toHaveBeenCalled();
    expect(subscriptionsRepository.refreshPopularityRanks).not.toHaveBeenCalled();
  });

  it('returns stored episodes and does not fall back to the subscribed items API', async () => {
    vi.mocked(subscriptionsRepository.list).mockResolvedValue([followedShow()]);
    vi.mocked(channelItemsRepository.listSubscribed).mockResolvedValue([]);

    const rows = await fetchHomeFeedRows('episodes');

    expect(rows).toEqual([]);
    expect(channelItemsRepository.hasPopularityRanks).not.toHaveBeenCalled();
    expect(channelItemsRepository.refreshPopularityRanks).not.toHaveBeenCalled();
  });

  it('reads clips from the local snapshot only', async () => {
    vi.mocked(homeClipsCacheRepository.listPayload).mockResolvedValue([
      { id_text: 'clip-1', title: 'A clip', podcast_title: 'Example Show' },
    ]);

    const rows = await fetchHomeFeedRows('clips');

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'clip-1',
        subtitle: 'Example Show',
        title: 'A clip',
      }),
    ]);
  });

  it('paints follow titles when badge queries hang and records home_feed_metadata_timeout', async () => {
    vi.useFakeTimers();
    vi.mocked(subscriptionsRepository.list).mockResolvedValue([followedShow()]);
    vi.mocked(channelLiveStatusRepository.listBroadcastingKeys).mockResolvedValue([]);
    vi.mocked(downloadsRepository.countCompletedByChannel).mockResolvedValue(new Map());
    vi.mocked(channelSeenRepository.listUnseen).mockReturnValue(new Promise(() => undefined));

    const pending = fetchHomeFeedRows('podcasts');
    await vi.advanceTimersByTimeAsync(HOME_FEED_METADATA_TIMEOUT_MS);
    const rows = await pending;

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'show-1',
        title: 'Example Show',
      }),
    ]);

    expect(syncEventLogRepository.append).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: HOME_FEED_METADATA_TIMEOUT_CODE,
        jobKind: 'home-feed-read',
        outcome: 'failure',
      })
    );
  });
});
