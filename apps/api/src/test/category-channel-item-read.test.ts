import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveItemStatusEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  TEST_USER_ACCOUNT_ID_TEXT,
} from './helpers/index.js';

const TEST_EMAIL = 'ccir-test@example.com';
const TEST_USER_ID = 1;

const _requestMock = vi.hoisted(() =>
  vi.fn(
    async (): Promise<{ status: number; data: { body: string } }> => ({
      status: 200,
      data: { body: 'transcript body' },
    })
  )
);

vi.mock('../lib/_request.js', () => ({
  _request: _requestMock,
}));

/**
 * Default mock implementations extracted as named factories so they can be
 * re-applied in `beforeEach` after `mockReset()` clears all queued
 * `mockResolvedValueOnce` values. Without this, a previous test's queued
 * one-shot return value could leak into the next test (e.g.
 * `getAccountMock` queued in an authenticated test that didn't fully
 * consume the queue could cause a later auth-less test to fall through
 * the auth path with an unexpected stub).
 */
const {
  categoryGetMock,
  categoryGetAllMock,
  channelGetByIdOrIdTextMock,
  channelGetByPodcastIndexIdMock,
  channelGetManyMock,
  statsChGetManyMock,
  statsChGetManyByChannelsAndCountMock,
  accountFollowingGetFollowedMock,
  itemGetByIdOrIdTextMock,
  itemGetManyMock,
  itemGetManyByChannelsMock,
  itemGetManyByChannelMock,
  itemGetManyByChannelBySeasonMock,
  itemGetManyByChannelShuffleMock,
  itemGetManyForQueueByPubDateMock,
  itemGetManyForQueueBySeasonMock,
  itemGetManyByChannelWithLiveItemMock,
  statsItGetManyMock,
  statsItGetManyByChannelsAndCountMock,
  itemChGetByIdTextMock,
  itemChGetAllWithCountMock,
  itemSoundbiteGetByIdTextMock,
  itemSoundbiteGetManyAndCountMock,
  itemTranscriptGetManyMock,
  channelPodrollGetMock,
  publisherFeedGetMock,
  getAccountMock,
  defaultImpls,
} = vi.hoisted(() => {
  const defaultCategoryGet = async (id: number) =>
    id === 404
      ? null
      : {
          id: 1,
          title: 'Test Category',
        };
  const defaultCategoryGetAll = async () => [
    { id: 1, title: 'A' },
    { id: 2, title: 'B' },
  ];
  const defaultChannelGetByPodcastIndexId = async () =>
    ({ id: 7, id_text: 'by-pi' }) as Record<string, unknown> | null;
  const defaultChannelGetMany = async () =>
    [{ id: 1, id_text: 'ch-1' }] as Record<string, unknown>[];
  const defaultStatsChGetMany = async () =>
    [{ id: 1, channel: { id: 1, id_text: 'st-ch' } }] as Record<string, unknown>[];
  const defaultStatsChGetManyByChannelsAndCount = async (): Promise<
    [Record<string, unknown>[], number]
  > => [[{ channel: { id: 1, id_text: 'subch' } }], 1];
  const defaultAccountFollowingGetFollowed = async (
    _a: number,
    _m: string | null,
    config?: unknown
  ): Promise<{ results: Record<string, unknown>[]; count: number }> => {
    if (config) {
      return {
        results: [
          { channel: { id: 1, id_text: 'f-ch', channel_about: { last_pub_date: new Date() } } },
        ],
        count: 1,
      };
    }
    return { results: [{ channel_id: 1 }], count: 1 };
  };
  const defaultItemGetMany = async () => [{ id: 10, id_text: 'it-1' }] as Record<string, unknown>[];
  const defaultItemGetManyByChannels = async () =>
    [{ id: 11, id_text: 'sub-it' }] as Record<string, unknown>[];
  const defaultItemGetManyByChannel = async () =>
    [{ id: 12, id_text: 'ch-it' }] as Record<string, unknown>[];
  const defaultItemGetManyByChannelBySeason = async () =>
    [{ id: 13, id_text: 's-it' }] as Record<string, unknown>[];
  const defaultItemGetManyByChannelShuffle = async () =>
    [{ id: 14, id_text: 'shuf' }] as Record<string, unknown>[];
  const defaultItemGetManyForQueueByPubDate = async () =>
    [{ id: 15, id_text: 'q-pd' }] as Record<string, unknown>[];
  const defaultItemGetManyForQueueBySeason = async () =>
    [{ id: 16, id_text: 'q-se' }] as Record<string, unknown>[];
  const defaultItemGetManyByChannelWithLiveItem = async () =>
    [
      {
        id: 1,
        live_item: {
          start_time: new Date('2025-01-01'),
          end_time: new Date('2025-01-02'),
          live_item_status: { id: LiveItemStatusEnum.Live },
        },
      },
      {
        id: 2,
        live_item: {
          start_time: new Date('2025-01-03'),
          end_time: new Date('2025-01-04'),
          live_item_status: { id: LiveItemStatusEnum.Pending },
        },
      },
      {
        id: 3,
        live_item: {
          start_time: new Date('2025-01-05'),
          end_time: new Date('2025-01-06'),
          live_item_status: { id: LiveItemStatusEnum.Ended },
        },
      },
    ] as Record<string, unknown>[];
  const defaultStatsItGetMany = async () =>
    [{ id: 1, item: { id: 10, id_text: 'st-it' } }] as Record<string, unknown>[];
  const defaultStatsItGetManyByChannelsAndCount = async (): Promise<
    [Record<string, unknown>[], number]
  > => [[{ item: { id: 20, id_text: 'subtop' } }], 2];
  const defaultItemChGetByIdText = async (): Promise<Record<string, unknown> | null> => ({
    id: 1,
    id_text: 'ic-some-id',
    data_hash: 'mock-hash',
    start_time: '0',
    end_time: null,
    title: 'Mock chapter',
    img: null,
    web_url: null,
    table_of_contents: true,
    item_chapters_object: {
      item_chapters_feed: {
        id: 77,
        url: 'https://example.com/chapters.json',
        type: 'application/json',
        item: {
          id: 10,
          id_text: 'ep-1',
          channel_id: '5',
        },
      },
    },
  });
  const defaultItemChGetAllWithCount = async () => ({
    results: [
      { id: 1, start_time: '0', end_time: '60', title: 'One', table_of_contents: true },
      { id: 2, start_time: '60', end_time: '120', title: 'Two', table_of_contents: true },
    ],
  });
  const defaultItemSoundbiteGetByIdText = async () =>
    ({ id: 1, id_text: 'sb-1', item: { id: 1, id_text: 'ep' } }) as Record<string, unknown> | null;
  const defaultItemSoundbiteGetManyAndCount = async (): Promise<
    [Record<string, unknown>[], number]
  > => [[{ id: 1, id_text: 'sbx' }], 1];
  const defaultItemTranscriptGetMany = async (): Promise<Record<string, unknown>[]> => [
    { id: 1, url: 'https://example.com/tr.json' },
  ];
  const defaultChannelPodrollGet = async () => ({
    podrollChannelsAdded: [],
    podrollChannelsUnadded: [],
    podrollItemsAdded: [],
    podrollItemsUnadded: [],
  });
  const defaultPublisherFeedGet = async () => ({
    channel: { id: 1, id_text: 'pub-ch' },
    publisherChannelsAdded: [],
    publisherChannelsUnadded: [],
    publisherItemsAdded: [],
    publisherItemsUnadded: [],
  });
  const defaultGetAccount = async (id: number) => {
    if (id !== TEST_USER_ID) {
      return null;
    }
    return {
      id: TEST_USER_ID,
      id_text: TEST_USER_ACCOUNT_ID_TEXT,
      account_credentials: { email: TEST_EMAIL },
      account_membership_status: {
        membership_expires_at: new Date(Date.now() + 86400000 * 365),
      },
    };
  };

  return {
    categoryGetMock: vi.fn(defaultCategoryGet),
    categoryGetAllMock: vi.fn(defaultCategoryGetAll),
    channelGetByIdOrIdTextMock: vi.fn(async () => null),
    channelGetByPodcastIndexIdMock: vi.fn(defaultChannelGetByPodcastIndexId),
    channelGetManyMock: vi.fn(defaultChannelGetMany),
    statsChGetManyMock: vi.fn(defaultStatsChGetMany),
    statsChGetManyByChannelsAndCountMock: vi.fn(defaultStatsChGetManyByChannelsAndCount),
    accountFollowingGetFollowedMock: vi.fn(defaultAccountFollowingGetFollowed),
    itemGetByIdOrIdTextMock: vi.fn(async () => null),
    itemGetManyMock: vi.fn(defaultItemGetMany),
    itemGetManyByChannelsMock: vi.fn(defaultItemGetManyByChannels),
    itemGetManyByChannelMock: vi.fn(defaultItemGetManyByChannel),
    itemGetManyByChannelBySeasonMock: vi.fn(defaultItemGetManyByChannelBySeason),
    itemGetManyByChannelShuffleMock: vi.fn(defaultItemGetManyByChannelShuffle),
    itemGetManyForQueueByPubDateMock: vi.fn(defaultItemGetManyForQueueByPubDate),
    itemGetManyForQueueBySeasonMock: vi.fn(defaultItemGetManyForQueueBySeason),
    itemGetManyByChannelWithLiveItemMock: vi.fn(defaultItemGetManyByChannelWithLiveItem),
    statsItGetManyMock: vi.fn(defaultStatsItGetMany),
    statsItGetManyByChannelsAndCountMock: vi.fn(defaultStatsItGetManyByChannelsAndCount),
    itemChGetByIdTextMock: vi.fn(defaultItemChGetByIdText),
    itemChGetAllWithCountMock: vi.fn(defaultItemChGetAllWithCount),
    itemSoundbiteGetByIdTextMock: vi.fn(defaultItemSoundbiteGetByIdText),
    itemSoundbiteGetManyAndCountMock: vi.fn(defaultItemSoundbiteGetManyAndCount),
    itemTranscriptGetManyMock: vi.fn(defaultItemTranscriptGetMany),
    channelPodrollGetMock: vi.fn(defaultChannelPodrollGet),
    publisherFeedGetMock: vi.fn(defaultPublisherFeedGet),
    getAccountMock: vi.fn(defaultGetAccount),
    defaultImpls: {
      categoryGet: defaultCategoryGet,
      categoryGetAll: defaultCategoryGetAll,
      channelGetByPodcastIndexId: defaultChannelGetByPodcastIndexId,
      channelGetMany: defaultChannelGetMany,
      statsChGetMany: defaultStatsChGetMany,
      statsChGetManyByChannelsAndCount: defaultStatsChGetManyByChannelsAndCount,
      accountFollowingGetFollowed: defaultAccountFollowingGetFollowed,
      itemGetMany: defaultItemGetMany,
      itemGetManyByChannels: defaultItemGetManyByChannels,
      itemGetManyByChannel: defaultItemGetManyByChannel,
      itemGetManyByChannelBySeason: defaultItemGetManyByChannelBySeason,
      itemGetManyByChannelShuffle: defaultItemGetManyByChannelShuffle,
      itemGetManyForQueueByPubDate: defaultItemGetManyForQueueByPubDate,
      itemGetManyForQueueBySeason: defaultItemGetManyForQueueBySeason,
      itemGetManyByChannelWithLiveItem: defaultItemGetManyByChannelWithLiveItem,
      statsItGetMany: defaultStatsItGetMany,
      statsItGetManyByChannelsAndCount: defaultStatsItGetManyByChannelsAndCount,
      itemChGetByIdText: defaultItemChGetByIdText,
      itemChGetAllWithCount: defaultItemChGetAllWithCount,
      itemSoundbiteGetByIdText: defaultItemSoundbiteGetByIdText,
      itemSoundbiteGetManyAndCount: defaultItemSoundbiteGetManyAndCount,
      itemTranscriptGetMany: defaultItemTranscriptGetMany,
      channelPodrollGet: defaultChannelPodrollGet,
      publisherFeedGet: defaultPublisherFeedGet,
      getAccount: defaultGetAccount,
    },
  };
});

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}

    get = categoryGetMock;
    getAll = categoryGetAllMock;
  }

  class MockAccountService {
    get = getAccountMock;
  }

  class MockAccountFollowingChannelService {
    getFollowedChannelsWithCount = accountFollowingGetFollowedMock;
  }

  class MockChannelService {
    getByIdOrIdText = channelGetByIdOrIdTextMock;
    getByPodcastIndexId = channelGetByPodcastIndexIdMock;
    getMany = channelGetManyMock;
  }

  class MockStatsAggregatedChannelService {
    getMany = statsChGetManyMock;
    getManyByChannelsAndCount = statsChGetManyByChannelsAndCountMock;
  }

  class MockItemService {
    getByIdOrIdText = itemGetByIdOrIdTextMock;
    getMany = itemGetManyMock;
    getManyByChannels = itemGetManyByChannelsMock;
    getManyByChannel = itemGetManyByChannelMock;
    getManyByChannelBySeason = itemGetManyByChannelBySeasonMock;
    getManyByChannelShuffle = itemGetManyByChannelShuffleMock;
    getManyForQueueByPubDate = itemGetManyForQueueByPubDateMock;
    getManyForQueueBySeason = itemGetManyForQueueBySeasonMock;
    getManyByChannelWithLiveItem = itemGetManyByChannelWithLiveItemMock;
  }

  class MockStatsAggregatedItemService {
    getMany = statsItGetManyMock;
    getManyByChannelsAndCount = statsItGetManyByChannelsAndCountMock;
  }

  class MockItemChapterService {
    getByIdText = itemChGetByIdTextMock;
    getAllWithCount = itemChGetAllWithCountMock;
  }

  class MockItemSoundbiteService {
    getByIdText = itemSoundbiteGetByIdTextMock;
    getManyAndCount = itemSoundbiteGetManyAndCountMock;
  }

  class MockItemTranscriptService {
    getMany = itemTranscriptGetManyMock;
  }

  class MockChannelPodrollService {
    getPodrollForChannel = channelPodrollGetMock;
  }

  class MockPublisherFeedService {
    getPublisherFeedRemoteItemsForChannel = publisherFeedGetMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    AccountFollowingChannelService: MockAccountFollowingChannelService,
    ChannelService: MockChannelService,
    StatsAggregatedChannelService: MockStatsAggregatedChannelService,
    ItemService: MockItemService,
    StatsAggregatedItemService: MockStatsAggregatedItemService,
    ItemChapterService: MockItemChapterService,
    ItemSoundbiteService: MockItemSoundbiteService,
    ItemTranscriptService: MockItemTranscriptService,
    ChannelPodrollService: MockChannelPodrollService,
    PublisherFeedService: MockPublisherFeedService,
  };
});

const listQuery = 'medium=podcasts&page=1';
const listQueryTop = 'medium=podcasts&page=1&range=week';
const categoryQ = 'medium=podcasts&page=1&category=arts';
const categoryQTop = 'medium=podcasts&page=1&category=arts&range=week';
const liveQ = (extra: string) => `medium=podcasts&page=1&liveItemType=${extra}`;

describe('category, channel, item, chapters, soundbites, transcripts, live, podroll, publisher read', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let base: string;
  let categoryBase: string;
  let channelBase: string;
  let itemBase: string;
  let itemChapterBase: string;
  let itemSoundbiteBase: string;
  let itemTranscriptBase: string;
  let liveItemBase: string;
  let podrollBase: string;
  let publisherFeedBase: string;

  const auth = () => authHeaders(TEST_USER_ID);

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    base = await getBaseApiUrl();
    categoryBase = `${base}/category`;
    channelBase = `${base}/channel`;
    itemBase = `${base}/item`;
    itemChapterBase = `${base}/item-chapter`;
    itemSoundbiteBase = `${base}/item-soundbite`;
    itemTranscriptBase = `${base}/item-transcript`;
    liveItemBase = `${base}/live-item`;
    podrollBase = `${base}/podroll`;
    publisherFeedBase = `${base}/publisher-feed`;
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  beforeEach(() => {
    /**
     * Reset every mock that any test in this suite uses with
     * `mockResolvedValueOnce` so that an un-consumed one-shot return
     * value from a previous test cannot leak across test boundaries.
     * `mockReset()` also clears the default implementation, so each
     * mock is re-bound to its default impl from `defaultImpls` (or to
     * an inline impl when the default depends on the per-test id).
     *
     * Without this, a flaky failure was observed in the full-suite
     * `e2e_test_report` order where `getAccountMock` and similar mocks
     * accumulated queued returns and unrelated routes resolved to the
     * wrong status (e.g. 404 instead of 401 for
     * `/channel/subscribed/recent` without auth, and 401 instead of
     * 200 for `/item/global/recent`).
     */
    _requestMock.mockClear();

    categoryGetMock.mockReset();
    categoryGetMock.mockImplementation(defaultImpls.categoryGet);
    categoryGetAllMock.mockReset();
    categoryGetAllMock.mockImplementation(defaultImpls.categoryGetAll);

    channelGetByIdOrIdTextMock.mockReset();
    channelGetByIdOrIdTextMock.mockImplementation(async (id: string) => {
      if (id === 'missing-chan' || id === '404') {
        return null;
      }
      return {
        id: 1,
        id_text: 'ch-1',
        channel_about: { episode_count: 3, last_pub_date: new Date() },
      };
    });

    channelGetByPodcastIndexIdMock.mockReset();
    channelGetByPodcastIndexIdMock.mockImplementation(defaultImpls.channelGetByPodcastIndexId);
    channelGetManyMock.mockReset();
    channelGetManyMock.mockImplementation(defaultImpls.channelGetMany);
    statsChGetManyMock.mockReset();
    statsChGetManyMock.mockImplementation(defaultImpls.statsChGetMany);
    statsChGetManyByChannelsAndCountMock.mockReset();
    statsChGetManyByChannelsAndCountMock.mockImplementation(
      defaultImpls.statsChGetManyByChannelsAndCount
    );
    accountFollowingGetFollowedMock.mockReset();
    accountFollowingGetFollowedMock.mockImplementation(defaultImpls.accountFollowingGetFollowed);

    itemGetByIdOrIdTextMock.mockReset();
    itemGetByIdOrIdTextMock.mockImplementation(async (id: string) => {
      if (id === 'missing-item' || id === '404') {
        return null;
      }
      if (id === 'ch-ep' || id.startsWith('it-ch')) {
        return {
          id: 1,
          id_text: id,
          item_chapters_feed: {
            id: 1,
            item_chapters_feed_log: { last_finished_parse_time: new Date() },
          },
        };
      }
      return { id: 1, id_text: 'it-ok', item: {} };
    });

    itemGetManyMock.mockReset();
    itemGetManyMock.mockImplementation(defaultImpls.itemGetMany);
    itemGetManyByChannelsMock.mockReset();
    itemGetManyByChannelsMock.mockImplementation(defaultImpls.itemGetManyByChannels);
    itemGetManyByChannelMock.mockReset();
    itemGetManyByChannelMock.mockImplementation(defaultImpls.itemGetManyByChannel);
    itemGetManyByChannelBySeasonMock.mockReset();
    itemGetManyByChannelBySeasonMock.mockImplementation(defaultImpls.itemGetManyByChannelBySeason);
    itemGetManyByChannelShuffleMock.mockReset();
    itemGetManyByChannelShuffleMock.mockImplementation(defaultImpls.itemGetManyByChannelShuffle);
    itemGetManyForQueueByPubDateMock.mockReset();
    itemGetManyForQueueByPubDateMock.mockImplementation(defaultImpls.itemGetManyForQueueByPubDate);
    itemGetManyForQueueBySeasonMock.mockReset();
    itemGetManyForQueueBySeasonMock.mockImplementation(defaultImpls.itemGetManyForQueueBySeason);
    itemGetManyByChannelWithLiveItemMock.mockReset();
    itemGetManyByChannelWithLiveItemMock.mockImplementation(
      defaultImpls.itemGetManyByChannelWithLiveItem
    );
    statsItGetManyMock.mockReset();
    statsItGetManyMock.mockImplementation(defaultImpls.statsItGetMany);
    statsItGetManyByChannelsAndCountMock.mockReset();
    statsItGetManyByChannelsAndCountMock.mockImplementation(
      defaultImpls.statsItGetManyByChannelsAndCount
    );

    itemChGetByIdTextMock.mockReset();
    itemChGetByIdTextMock.mockImplementation(defaultImpls.itemChGetByIdText);
    itemChGetAllWithCountMock.mockReset();
    itemChGetAllWithCountMock.mockImplementation(defaultImpls.itemChGetAllWithCount);
    itemSoundbiteGetByIdTextMock.mockReset();
    itemSoundbiteGetByIdTextMock.mockImplementation(defaultImpls.itemSoundbiteGetByIdText);
    itemSoundbiteGetManyAndCountMock.mockReset();
    itemSoundbiteGetManyAndCountMock.mockImplementation(defaultImpls.itemSoundbiteGetManyAndCount);
    itemTranscriptGetManyMock.mockReset();
    itemTranscriptGetManyMock.mockImplementation(defaultImpls.itemTranscriptGetMany);

    channelPodrollGetMock.mockReset();
    channelPodrollGetMock.mockImplementation(defaultImpls.channelPodrollGet);
    publisherFeedGetMock.mockReset();
    publisherFeedGetMock.mockImplementation(defaultImpls.publisherFeedGet);

    getAccountMock.mockReset();
    getAccountMock.mockImplementation(defaultImpls.getAccount);
  });

  describe('category', () => {
    it('GET /category/:id returns 200 and category from CategoryService.get', async () => {
      const res = await request(app).get(`${categoryBase}/1`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    it('GET /category root returns 200 and { data } array from getAll', async () => {
      const res = await request(app).get(`${categoryBase}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /category/:id returns 404 when not found', async () => {
      const res = await request(app).get(`${categoryBase}/404`);
      expect(res.status).toBe(404);
    });
  });

  describe('channel', () => {
    it('GET /channel/global/recent returns 200 with data array', async () => {
      const res = await request(app).get(`${channelBase}/global/recent?${listQuery}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('GET /channel/global/top returns 200', async () => {
      const res = await request(app).get(`${channelBase}/global/top?${listQueryTop}`);
      expect(res.status).toBe(200);
    });

    it('GET /channel/category/recent returns 200 with category + medium + page', async () => {
      const res = await request(app).get(`${channelBase}/category/recent?${categoryQ}`);
      expect(res.status).toBe(200);
    });

    it('GET /channel/:idOrIdText returns 200 for existing channel', async () => {
      const res = await request(app).get(`${channelBase}/ch-1`);
      expect(res.status).toBe(200);
    });

    it('GET /channel/:idOrIdText returns 404 when not found', async () => {
      channelGetByIdOrIdTextMock.mockResolvedValueOnce(null);
      const res = await request(app).get(`${channelBase}/missing`);
      expect(res.status).toBe(404);
    });

    it('GET /channel/:idOrIdText returns 404 when channel exists but is not parsed-ready', async () => {
      channelGetByIdOrIdTextMock.mockResolvedValueOnce({
        id: 9,
        id_text: 'placeholder-ch',
        channel_about: null,
      });
      const res = await request(app).get(`${channelBase}/placeholder-ch`);
      expect(res.status).toBe(404);
    });

    it('GET /channel/subscribed/recent returns 200 when authenticated', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      const res = await request(app)
        .get(`${channelBase}/subscribed/recent?${listQuery}`)
        .set(auth());
      expect(res.status).toBe(200);
    });

    it('GET /channel/subscribed/recent returns 401 without auth', async () => {
      const res = await request(app).get(`${channelBase}/subscribed/recent?${listQuery}`);
      expect(res.status).toBe(401);
    });

    it('GET /channel/podcast-index/:id returns 200 with channel or null from PodcastIndex', async () => {
      const res = await request(app).get(`${channelBase}/podcast-index/12345`);
      expect(res.status).toBe(200);
    });

    it('GET /channel/podcast-index/:id returns null when channel is not parsed-ready', async () => {
      channelGetByPodcastIndexIdMock.mockResolvedValueOnce({
        id: 7,
        id_text: 'by-pi',
        channel_about: null,
      });
      const res = await request(app).get(`${channelBase}/podcast-index/12345`);
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });

  describe('item', () => {
    it('GET /item/global/recent returns 200', async () => {
      const res = await request(app).get(`${itemBase}/global/recent?${listQuery}`);
      expect(res.status).toBe(200);
    });

    it('GET /item/global/top returns 200', async () => {
      const res = await request(app).get(`${itemBase}/global/top?${listQueryTop}`);
      expect(res.status).toBe(200);
    });

    it('GET /item/category/recent returns 200 with query params', async () => {
      const res = await request(app).get(`${itemBase}/category/recent?${categoryQ}`);
      expect(res.status).toBe(200);
    });

    it('GET /item/channel/recent/:channelId returns 200', async () => {
      const res = await request(app).get(`${itemBase}/channel/recent/ch-1`).query({ page: 1 });
      expect(res.status).toBe(200);
    });

    it('GET /item/channel/recent/:channelId returns 404 when channel is not parsed-ready', async () => {
      channelGetByIdOrIdTextMock.mockResolvedValueOnce({
        id: 1,
        id_text: 'ch-placeholder',
        channel_about: null,
      });
      const res = await request(app)
        .get(`${itemBase}/channel/recent/ch-placeholder`)
        .query({ page: 1 });
      expect(res.status).toBe(404);
    });

    it('GET /item/channel/shuffle/:channelId returns 200 with shuffleHash', async () => {
      const res = await request(app)
        .get(`${itemBase}/channel/shuffle/ch-1`)
        .query({ page: 1, shuffleHash: 'h1' });
      expect(res.status).toBe(200);
    });

    it('GET /item/:idOrIdText returns 200', async () => {
      const res = await request(app).get(`${itemBase}/it-ok`);
      expect(res.status).toBe(200);
    });

    it('GET /item/:idOrIdText returns 404 when not found', async () => {
      const res = await request(app).get(`${itemBase}/404`);
      expect(res.status).toBe(404);
    });

    it('GET /item/subscribed/recent returns 200 when authenticated', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      const res = await request(app).get(`${itemBase}/subscribed/recent?${listQuery}`).set(auth());
      expect(res.status).toBe(200);
    });

    it('GET /item/subscribed/recent returns 401 without auth', async () => {
      const res = await request(app).get(`${itemBase}/subscribed/recent?${listQuery}`);
      expect(res.status).toBe(401);
    });

    it('GET /item/queue/pub-date/:idText returns 200', async () => {
      const res = await request(app)
        .get(`${itemBase}/queue/pub-date/queue-abc`)
        .query({ direction: 'forward' });
      expect(res.status).toBe(200);
    });

    it('GET /item/queue/season/:idText returns 200', async () => {
      const res = await request(app)
        .get(`${itemBase}/queue/season/qs-1`)
        .query({ direction: 'backward' });
      expect(res.status).toBe(200);
    });

    it('GET /item/chapters/:item_id_text returns 200 with chapter list (mocked service)', async () => {
      const res = await request(app).get(`${itemBase}/chapters/ch-ep`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('item-chapter, item-soundbite, item-transcript', () => {
    it('GET /item-chapter/:id returns 200 with DTO-shaped item_chapters_feed', async () => {
      const res = await request(app).get(`${itemChapterBase}/ic-some-id`);
      expect(res.status).toBe(200);
      expect(res.body.item_chapters_feed?.item?.id_text).toBe('ep-1');
      expect(res.body.item_chapters_feed_id).toBe(77);
    });

    it('GET /item-chapter/:id returns 404 when not found', async () => {
      itemChGetByIdTextMock.mockResolvedValueOnce(null);
      const res = await request(app).get(`${itemChapterBase}/missing-ic`);
      expect(res.status).toBe(404);
    });

    it('GET /item-chapter/:id returns 404 when parent item is missing', async () => {
      itemChGetByIdTextMock.mockResolvedValueOnce({
        id: 1,
        id_text: 'no-parent',
        data_hash: 'x',
        start_time: '0',
        end_time: null,
        title: null,
        img: null,
        web_url: null,
        table_of_contents: true,
        item_chapters_object: {
          item_chapters_feed: {
            id: 1,
            url: 'https://example.com/c.json',
            type: 'application/json',
            item: null,
          },
        },
      });
      const res = await request(app).get(`${itemChapterBase}/no-parent`);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: 'Item chapter parent item not found' });
    });

    it('GET /item-soundbite/:id returns 200', async () => {
      const res = await request(app).get(`${itemSoundbiteBase}/sb-abc`);
      expect(res.status).toBe(200);
    });

    it('GET /item-soundbite/:id returns 404 when not found', async () => {
      itemSoundbiteGetByIdTextMock.mockResolvedValueOnce(null);
      const res = await request(app).get(`${itemSoundbiteBase}/nope`);
      expect(res.status).toBe(404);
    });

    it('GET /item-soundbite/channel/:channel_id_text returns 200', async () => {
      const res = await request(app).get(`${itemSoundbiteBase}/channel/chan-1?${listQuery}`);
      expect(res.status).toBe(200);
    }, 15_000);

    it('GET /item-soundbite/item/:item_id_text returns 200', async () => {
      const res = await request(app).get(`${itemSoundbiteBase}/item/ep-1?${listQuery}`);
      expect(res.status).toBe(200);
    });

    it('GET /item-transcript/:item_id_text returns 200 and normalized data', async () => {
      const res = await request(app).get(`${itemTranscriptBase}/tr-item`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('GET /item-transcript/:item_id_text returns 404 when no transcript', async () => {
      itemTranscriptGetManyMock.mockResolvedValueOnce([]);
      const res = await request(app).get(`${itemTranscriptBase}/tr-none`);
      expect(res.status).toBe(404);
    });
  });

  describe('live-item', () => {
    it('GET /live-item/global/recent returns 200 (requires liveItemType + medium + page)', async () => {
      const res = await request(app).get(`${liveItemBase}/global/recent?${liveQ('live')}`);
      expect(res.status).toBe(200);
    });

    it('GET /live-item/global/top returns 200', async () => {
      const res = await request(app).get(
        `${liveItemBase}/global/top?${listQueryTop}&liveItemType=pending`
      );
      expect(res.status).toBe(200);
    });

    it('GET /live-item/category/recent and top return 200', async () => {
      const r1 = await request(app).get(
        `${liveItemBase}/category/recent?${categoryQ}&liveItemType=live`
      );
      const r2 = await request(app).get(
        `${liveItemBase}/category/top?${categoryQTop}&liveItemType=ended`
      );
      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
    });

    it('GET /live-item/channel/:id returns 200 (grouped by status)', async () => {
      const res = await request(app).get(`${liveItemBase}/channel/ch-1`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /live-item/channel/:id returns 404 when channel is not parsed-ready', async () => {
      channelGetByIdOrIdTextMock.mockImplementationOnce(async (channelId: string) => {
        if (channelId === 'ch-placeholder') {
          return {
            id: 1,
            id_text: 'ch-placeholder',
            channel_about: null,
          };
        }
        return {
          id: 1,
          id_text: 'ch-1',
          channel_about: { episode_count: 3, last_pub_date: new Date() },
        };
      });
      const res = await request(app).get(`${liveItemBase}/channel/ch-placeholder`);
      expect(res.status).toBe(404);
    });

    it('GET /live-item/subscribed/recent returns 200 when authenticated', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });
      const res = await request(app)
        .get(`${liveItemBase}/subscribed/recent?${liveQ('ended')}`)
        .set(auth());
      expect(res.status).toBe(200);
    });

    it('GET /live-item/subscribed/recent returns 401 without auth', async () => {
      const res = await request(app).get(`${liveItemBase}/subscribed/recent?${liveQ('live')}`);
      expect(res.status).toBe(401);
    });
  });

  describe('podroll and publisher-feed', () => {
    it('GET /podroll/channel/:idOrIdText returns 200 with remote items shape', async () => {
      const res = await request(app).get(`${podrollBase}/channel/chan-1`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('channelsAdded');
      expect(res.body).toHaveProperty('channelsUnadded');
      expect(res.body).toHaveProperty('itemsAdded');
      expect(res.body).toHaveProperty('itemsUnadded');
      expect(channelPodrollGetMock).toHaveBeenCalledWith('chan-1');
    });

    it('GET /publisher-feed/channel/:idOrIdText returns 200 with channel + items shape', async () => {
      const res = await request(app).get(`${publisherFeedBase}/channel/pub-1`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('channel');
    });
  });
});
