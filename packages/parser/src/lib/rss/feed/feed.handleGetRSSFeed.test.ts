import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  assertCatalogAdmitsNewFeedMock,
  getByPodcastIndexIdMock,
  getByUrlAndPodcastIndexIdMock,
  getByUrlMock,
  getOrCreateMock,
} = vi.hoisted(() => ({
  assertCatalogAdmitsNewFeedMock: vi.fn(),
  getByPodcastIndexIdMock: vi.fn(),
  getByUrlAndPodcastIndexIdMock: vi.fn(),
  getByUrlMock: vi.fn(),
  getOrCreateMock: vi.fn(),
}));

vi.mock('@parser/factories/timerManager.js', () => ({
  timerManager: {
    start: vi.fn(),
    end: vi.fn(),
  },
}));

vi.mock('../../../context.js', () => ({
  getParserConfig: () => ({ testAssetsMode: false }),
}));

vi.mock('../parser.js', () => ({
  getAndParseRSSFeed: vi.fn(),
}));

vi.mock('./catalogAdmission.js', () => ({
  assertCatalogAdmitsNewFeed: assertCatalogAdmitsNewFeedMock,
}));

vi.mock('@podverse/orm', () => ({
  FeedService: class FeedService {
    getByUrlAndPodcastIndexId = getByUrlAndPodcastIndexIdMock;
    getByPodcastIndexId = getByPodcastIndexIdMock;
    getByUrl = getByUrlMock;
    getOrCreate = getOrCreateMock;
  },
  FeedLogService: class FeedLogService {},
}));

import { FeedNotInCatalogError } from '../errors.js';
import { handleGetRSSFeed } from './feed.js';

const url = 'https://example.com/feed.xml';
const storedByUrlAndId = { id: 11, url };
const storedByUrl = { id: 12, url };
const created = { id: 13, url };

describe('handleGetRSSFeed catalog admission', () => {
  beforeEach(() => {
    getByUrlAndPodcastIndexIdMock.mockReset();
    getByPodcastIndexIdMock.mockReset();
    getByUrlMock.mockReset();
    getOrCreateMock.mockReset();
    assertCatalogAdmitsNewFeedMock.mockReset();
    getByUrlAndPodcastIndexIdMock.mockResolvedValue(null);
    getByPodcastIndexIdMock.mockResolvedValue(null);
    getByUrlMock.mockResolvedValue(null);
    getOrCreateMock.mockResolvedValue(created);
    assertCatalogAdmitsNewFeedMock.mockResolvedValue(undefined);
  });

  it('returns a row found by url and id without the gate or getOrCreate', async () => {
    getByUrlAndPodcastIndexIdMock.mockResolvedValue(storedByUrlAndId);

    await expect(handleGetRSSFeed(url, 11)).resolves.toBe(storedByUrlAndId);

    expect(assertCatalogAdmitsNewFeedMock).not.toHaveBeenCalled();
    expect(getOrCreateMock).not.toHaveBeenCalled();
  });

  it('returns a row found only by url without the gate or getOrCreate', async () => {
    getByUrlMock.mockResolvedValue(storedByUrl);

    await expect(handleGetRSSFeed(url, 11)).resolves.toBe(storedByUrl);

    expect(getByUrlMock).toHaveBeenCalledWith({ url });
    expect(assertCatalogAdmitsNewFeedMock).not.toHaveBeenCalled();
    expect(getOrCreateMock).not.toHaveBeenCalled();
  });

  it('asks the gate, then creates the row, when nothing is stored', async () => {
    await expect(
      handleGetRSSFeed(url, 9, { catalogAllowlistSourcePodcastIndexId: 4 })
    ).resolves.toBe(created);

    expect(assertCatalogAdmitsNewFeedMock).toHaveBeenCalledWith({
      url,
      podcastIndexId: 9,
      catalogAllowlistSourcePodcastIndexId: 4,
    });
    expect(getOrCreateMock).toHaveBeenCalledWith({ url, podcast_index_id: 9 });
    const gateOrder = assertCatalogAdmitsNewFeedMock.mock.invocationCallOrder[0];
    const createOrder = getOrCreateMock.mock.invocationCallOrder[0];
    if (gateOrder === undefined || createOrder === undefined) {
      throw new Error('Expected the gate and getOrCreate to have been called');
    }
    expect(gateOrder).toBeLessThan(createOrder);
  });

  it('does not create a row when the gate refuses the feed', async () => {
    assertCatalogAdmitsNewFeedMock.mockRejectedValue(
      new FeedNotInCatalogError(9, 'not_on_allowlist')
    );

    await expect(handleGetRSSFeed(url, 9)).rejects.toBeInstanceOf(FeedNotInCatalogError);

    expect(getOrCreateMock).not.toHaveBeenCalled();
  });
});
