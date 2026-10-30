import { randomUUID } from 'node:crypto';

import type { Express } from 'express';
import type { Server } from 'http';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IndexProviderFeed } from '@podverse/helpers';
import { AccountMembershipEnum, MediumEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  TEST_USER_ACCOUNT_ID_TEXT,
} from './helpers/index.js';

const TEST_USER_ID = 1;

const providerMocks = vi.hoisted(() => ({
  resolveFeedsByGuid: vi.fn(async () => ({
    status: 'found',
    value: new Map<string, IndexProviderFeed>(),
  })),
  resolveFeed: vi.fn(async () => ({ status: 'not_found' })),
  getFeedById: vi.fn(async () => ({ status: 'not_found' })),
  resolveItem: vi.fn(async () => ({ status: 'not_found' })),
}));

const accountStub = {
  id: TEST_USER_ID,
  id_text: TEST_USER_ACCOUNT_ID_TEXT,
  account_credentials: { email: 'account-add-by-rss-remote-item@example.com' },
  account_membership_status: {
    membership_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    account_membership: { id: AccountMembershipEnum.Premium },
  },
  sharable_status: { id: 1 },
};

const getAccountMock = vi.hoisted(() => vi.fn(async () => accountStub));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    get = getAccountMock;
    getByIdText = getAccountMock;
  }

  return {
    ...actual,
    AccountService: MockAccountService,
    CategoryService: MockCategoryService,
  };
});

vi.mock('@api/factories/indexProvider.js', () => ({
  indexProvider: {
    id: 'podcast_index',
    resolveFeedsByGuid: providerMocks.resolveFeedsByGuid,
    resolveFeed: providerMocks.resolveFeed,
    getFeedById: providerMocks.getFeedById,
    resolveItem: providerMocks.resolveItem,
  },
}));

type SeededChannel = {
  idText: string;
  channelId: number;
  feedId: number;
  feedGuid: string;
  feedUrl: string;
};

type SeededWorld = {
  directory: SeededChannel;
  directoryItemGuid: string;
  directoryItemIdText: string;
  stubFeedGuid: string;
  stubFeedUrl: string;
  stubProviderFeedId: string;
  stubItemGuid: string;
  unknownFeedGuid: string;
  resolveFoundGuid: string;
  resolveFoundProviderFeedId: string;
  resolveFoundFeedUrl: string;
  resolveNotFoundGuid: string;
  resolveDeadGuid: string;
  resolveDeadFeedUrl: string;
  resolveDeadProviderFeedId: string;
  resolveUnavailableGuid: string;
  unresolvedGuidForValidation: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readResults(body: unknown): unknown[] {
  if (!isRecord(body) || !Array.isArray(body.results)) {
    return [];
  }
  return body.results;
}

function readKind(value: unknown): string | null {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return null;
  }
  return value.kind;
}

/** Fits `feed.podcast_index_id` (32-bit) and stays below the id bands other suites use. */
function podcastIndexId(runId: string, slot: number): number {
  const mixed = Number.parseInt(runId.slice(0, 6), 16);
  return 2_000_000_000 + mixed + slot;
}

/** Provider feed ids are looked up as `feed.podcast_index_id`, so they must fit in a 32-bit integer. */
function providerFeedId(runId: string, sliceStart: number, band: number): string {
  const mixed = Number.parseInt(runId.slice(sliceStart, sliceStart + 4), 16);
  return String(2_100_000_000 + band + mixed);
}

async function seedChannel(
  manager: EntityManager,
  role: string,
  runId: string,
  seededFeedIds: number[]
): Promise<SeededChannel> {
  const { Channel, Feed } = await import('@podverse/orm');
  const feedUrl = `https://add-by-rss-remote-item-${runId}.example.com/${role}.xml`;
  const feedRepo = manager.getRepository(Feed);
  const feed = await feedRepo.save(
    feedRepo.create({
      url: feedUrl,
      podcast_index_id: podcastIndexId(runId, seededFeedIds.length),
    })
  );
  seededFeedIds.push(feed.id);
  await manager.query(
    `INSERT INTO feed_policy (feed_id, parse_allowed, public_visible, add_allowed)
     VALUES ($1, true, true, true)`,
    [feed.id]
  );

  const channelRepo = manager.getRepository(Channel);
  const feedGuid = randomUUID();
  const channel = await channelRepo.save(
    channelRepo.create({
      feed_id: feed.id,
      medium_id: MediumEnum.Podcast,
      title: `Add-by-RSS Remote Item ${role}`,
      podcast_guid: feedGuid,
    })
  );
  await manager.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [channel.id]);

  return {
    idText: channel.id_text,
    channelId: channel.id,
    feedId: feed.id,
    feedGuid,
    feedUrl,
  };
}

async function seedWorld(manager: EntityManager, seededFeedIds: number[]): Promise<SeededWorld> {
  const { Item, RemoteChannelStubService, RemoteItemStubService } = await import('@podverse/orm');
  const runId = randomUUID().replaceAll('-', '');
  const directory = await seedChannel(manager, 'directory', runId, seededFeedIds);
  const directoryItemGuid = `https://add-by-rss-remote-item-${runId}.example.com/dir-item`;
  const itemRepo = manager.getRepository(Item);
  const directoryItem = await itemRepo.save(
    itemRepo.create({
      channel_id: String(directory.channelId),
      title: 'Directory item',
      guid: directoryItemGuid,
      item_flag_status: { id: 1 },
    })
  );

  const stubProviderFeedId = providerFeedId(runId, 0, 0);
  const stubFeedGuid = randomUUID();
  const stubFeedUrl = `https://add-by-rss-remote-item-${runId}.example.com/stub.xml`;
  const stubItemGuid = `https://add-by-rss-remote-item-${runId}.example.com/stub-item`;
  const remoteChannelStubService = new RemoteChannelStubService();
  const remoteItemStubService = new RemoteItemStubService();
  const channelStub = await remoteChannelStubService.upsertChannelStub(
    {
      indexProvider: 'podcast_index',
      providerFeedId: stubProviderFeedId,
      feedGuid: stubFeedGuid,
      feedUrl: stubFeedUrl,
      title: 'Stub channel',
      author: 'Stub author',
      description: null,
      imageUrl: null,
      medium: 'podcast',
      isDead: false,
    },
    [{ feedGuid: stubFeedGuid, feedUrl: stubFeedUrl }]
  );
  await remoteItemStubService.upsertItemStub(channelStub, {
    indexProvider: 'podcast_index',
    providerFeedId: stubProviderFeedId,
    providerItemId: '12345',
    itemGuid: stubItemGuid,
    title: 'Stub item',
    imageUrl: null,
    pubDate: new Date('2026-04-01T00:00:00.000Z'),
    durationSeconds: 120,
  });

  const resolveFoundGuid = randomUUID();
  const resolveFoundProviderFeedId = providerFeedId(runId, 4, 100_000);
  const resolveFoundFeedUrl = `https://add-by-rss-remote-item-${runId}.example.com/found.xml`;
  const resolveNotFoundGuid = randomUUID();
  const resolveDeadGuid = randomUUID();
  const resolveDeadProviderFeedId = providerFeedId(runId, 8, 200_000);
  const resolveDeadFeedUrl = `https://add-by-rss-remote-item-${runId}.example.com/dead.xml`;
  const resolveUnavailableGuid = randomUUID();

  return {
    directory,
    directoryItemGuid,
    directoryItemIdText: directoryItem.id_text,
    stubFeedGuid,
    stubFeedUrl,
    stubProviderFeedId,
    stubItemGuid,
    unknownFeedGuid: randomUUID(),
    resolveFoundGuid,
    resolveFoundProviderFeedId,
    resolveFoundFeedUrl,
    resolveNotFoundGuid,
    resolveDeadGuid,
    resolveDeadFeedUrl,
    resolveDeadProviderFeedId,
    resolveUnavailableGuid,
    unresolvedGuidForValidation: randomUUID(),
  };
}

describe('account add-by-rss remote item endpoints', () => {
  let app: Express | undefined;
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let baseApiUrl = '';
  let world: SeededWorld | undefined;
  const seededFeedIds: number[] = [];

  function requireApp(): Express {
    if (!app) {
      throw new Error('Expected test app');
    }
    return app;
  }

  function requireContext(): ORMContext {
    if (!ormContext) {
      throw new Error('Expected ORM context');
    }
    return ormContext;
  }

  function requireWorld(): SeededWorld {
    if (!world) {
      throw new Error('Expected seeded world');
    }
    return world;
  }

  const lookupPath = () => `${baseApiUrl}/account/add-by-rss/remote-item/lookup`;
  const resolvePath = () => `${baseApiUrl}/account/add-by-rss/remote-item/resolve`;

  async function channelStubForRef(feedGuid: string): Promise<string | null> {
    const { RemoteChannelStubService } = await import('@podverse/orm');
    const stubs = await new RemoteChannelStubService().getChannelStubsForRefs([
      { feedGuid, feedUrl: null },
    ]);
    return stubs[0]?.provider_feed_id ?? null;
  }

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    baseApiUrl = await getBaseApiUrl();
    world = await seedWorld(requireContext().dataSourceReadWrite.manager, seededFeedIds);
  }, 120000);

  afterAll(async () => {
    if (ormContext && world) {
      await ormContext.dataSourceReadWrite.query(
        `DELETE FROM remote_channel_stub
         WHERE index_provider = 'podcast_index'
           AND provider_feed_id = ANY($1::varchar[])`,
        [
          [
            world.stubProviderFeedId,
            world.resolveFoundProviderFeedId,
            world.resolveDeadProviderFeedId,
          ],
        ]
      );
      if (seededFeedIds.length > 0) {
        await ormContext.dataSourceReadWrite.query(`DELETE FROM feed WHERE id = ANY($1::int[])`, [
          seededFeedIds,
        ]);
      }
    }
    await stopTestApp(server, ormContext);
  });

  beforeEach(async () => {
    const seeded = requireWorld();
    providerMocks.resolveFeedsByGuid.mockReset();
    providerMocks.resolveFeed.mockReset();
    providerMocks.getFeedById.mockReset();
    providerMocks.resolveItem.mockReset();
    providerMocks.resolveFeedsByGuid.mockResolvedValue({
      status: 'found',
      value: new Map<string, IndexProviderFeed>([
        [
          seeded.resolveFoundGuid.toLowerCase(),
          {
            indexProvider: 'podcast_index',
            providerFeedId: seeded.resolveFoundProviderFeedId,
            feedGuid: seeded.resolveFoundGuid.toLowerCase(),
            feedUrl: seeded.resolveFoundFeedUrl,
            title: 'Provider found feed',
            author: 'Provider author',
            description: null,
            imageUrl: null,
            medium: 'podcast',
            isDead: false,
          },
        ],
      ]),
    });
    providerMocks.resolveFeed.mockResolvedValue({ status: 'not_found' });
    providerMocks.getFeedById.mockResolvedValue({ status: 'not_found' });
    providerMocks.resolveItem.mockResolvedValue({ status: 'not_found' });

    const { addByRssRemoteItemResolveRateLimit } =
      await import('../controllers/account/accountAddByRSSRemoteItem.js');
    addByRssRemoteItemResolveRateLimit.resetForUser(TEST_USER_ID);
  });

  it('lookup returns channel/provider_feed/none for channel refs without provider calls', async () => {
    const seeded = requireWorld();
    const response = await request(requireApp())
      .post(lookupPath())
      .set(authHeaders(TEST_USER_ID))
      .send({
        refs: [
          {
            feed_guid: seeded.directory.feedGuid,
            feed_url: seeded.directory.feedUrl,
            item_guid: null,
          },
          { feed_guid: seeded.stubFeedGuid, feed_url: seeded.stubFeedUrl, item_guid: null },
          { feed_guid: seeded.unknownFeedGuid, feed_url: null, item_guid: null },
        ],
      });

    expect(response.status).toBe(200);
    const results = readResults(response.body);
    expect(results).toHaveLength(3);
    expect(readKind(results[0])).toBe('channel');
    expect(readKind(results[1])).toBe('provider_feed');
    expect(readKind(results[2])).toBe('none');

    expect(providerMocks.resolveFeedsByGuid).not.toHaveBeenCalled();
    expect(providerMocks.resolveFeed).not.toHaveBeenCalled();
    expect(providerMocks.resolveItem).not.toHaveBeenCalled();
  });

  it('lookup returns item/channel/item_stub/provider_feed/none for item refs without provider calls', async () => {
    const seeded = requireWorld();
    const unknownItemGuid = `https://add-by-rss-remote-item.example.com/unknown-${randomUUID()}`;
    const stubMissingItemGuid = `https://add-by-rss-remote-item.example.com/stub-missing-${randomUUID()}`;

    const response = await request(requireApp())
      .post(lookupPath())
      .set(authHeaders(TEST_USER_ID))
      .send({
        refs: [
          {
            feed_guid: seeded.directory.feedGuid,
            feed_url: seeded.directory.feedUrl,
            item_guid: seeded.directoryItemGuid,
          },
          {
            feed_guid: seeded.directory.feedGuid,
            feed_url: seeded.directory.feedUrl,
            item_guid: unknownItemGuid,
          },
          {
            feed_guid: seeded.stubFeedGuid,
            feed_url: seeded.stubFeedUrl,
            item_guid: seeded.stubItemGuid,
          },
          {
            feed_guid: seeded.stubFeedGuid,
            feed_url: seeded.stubFeedUrl,
            item_guid: stubMissingItemGuid,
          },
          {
            feed_guid: seeded.unknownFeedGuid,
            feed_url: null,
            item_guid: unknownItemGuid,
          },
        ],
      });

    expect(response.status).toBe(200);
    const results = readResults(response.body);
    expect(results).toHaveLength(5);
    expect(readKind(results[0])).toBe('item');
    expect(readKind(results[1])).toBe('channel');
    expect(readKind(results[2])).toBe('item_stub');
    expect(readKind(results[3])).toBe('provider_feed');
    expect(readKind(results[4])).toBe('none');

    const first = results[0];
    if (isRecord(first) && isRecord(first.item)) {
      expect(first.item.id_text).toBe(seeded.directoryItemIdText);
      expect(isRecord(first.item.channel) ? first.item.channel.id_text : null).toBe(
        seeded.directory.idText
      );
    }

    expect(providerMocks.resolveFeedsByGuid).not.toHaveBeenCalled();
    expect(providerMocks.resolveFeed).not.toHaveBeenCalled();
    expect(providerMocks.resolveItem).not.toHaveBeenCalled();
  });

  it('lookup enforces max refs and session auth', async () => {
    const seeded = requireWorld();
    const tooMany = Array.from({ length: 101 }, () => ({
      feed_guid: seeded.directory.feedGuid,
      feed_url: seeded.directory.feedUrl,
      item_guid: null,
    }));

    const tooManyResponse = await request(requireApp())
      .post(lookupPath())
      .set(authHeaders(TEST_USER_ID))
      .send({ refs: tooMany });
    expect(tooManyResponse.status).toBe(400);

    const unauthorized = await request(requireApp())
      .post(lookupPath())
      .send({
        refs: [{ feed_guid: seeded.directory.feedGuid, feed_url: null, item_guid: null }],
      });
    expect(unauthorized.status).toBe(401);
  });

  it('resolve returns channel for directory refs and bypasses provider', async () => {
    const seeded = requireWorld();
    const response = await request(requireApp())
      .post(resolvePath())
      .set(authHeaders(TEST_USER_ID))
      .send({ feed_guid: seeded.directory.feedGuid, feed_url: seeded.directory.feedUrl });

    expect(response.status).toBe(200);
    expect(response.body.kind).toBe('channel');
    expect(response.body.channel?.id_text).toBe(seeded.directory.idText);
    expect(providerMocks.resolveFeedsByGuid).not.toHaveBeenCalled();
  });

  it('resolve returns provider_feed for found refs, writes a stub, and reuses it on the next call', async () => {
    const seeded = requireWorld();

    const first = await request(requireApp())
      .post(resolvePath())
      .set(authHeaders(TEST_USER_ID))
      .send({ feed_guid: seeded.resolveFoundGuid, feed_url: null });

    expect(first.status).toBe(200);
    expect(first.body.kind).toBe('provider_feed');
    expect(first.body.provider_feed?.provider_feed_id).toBe(seeded.resolveFoundProviderFeedId);
    expect(providerMocks.resolveFeedsByGuid).toHaveBeenCalledTimes(1);
    expect(providerMocks.resolveFeedsByGuid.mock.calls[0]?.[0]).toEqual([
      seeded.resolveFoundGuid.toLowerCase(),
    ]);
    expect(providerMocks.resolveItem).not.toHaveBeenCalled();
    expect(await channelStubForRef(seeded.resolveFoundGuid)).toBe(
      seeded.resolveFoundProviderFeedId
    );

    providerMocks.resolveFeedsByGuid.mockClear();
    providerMocks.resolveFeed.mockClear();

    const second = await request(requireApp())
      .post(resolvePath())
      .set(authHeaders(TEST_USER_ID))
      .send({ feed_guid: seeded.resolveFoundGuid, feed_url: null });

    expect(second.status).toBe(200);
    expect(second.body.kind).toBe('provider_feed');
    expect(providerMocks.resolveFeedsByGuid).not.toHaveBeenCalled();
    expect(providerMocks.resolveFeed).not.toHaveBeenCalled();
  });

  it('resolve returns not_found for provider misses and dead feeds, and does not write stubs', async () => {
    const seeded = requireWorld();
    providerMocks.resolveFeedsByGuid.mockResolvedValueOnce({
      status: 'found',
      value: new Map<string, IndexProviderFeed>(),
    });

    const notFound = await request(requireApp())
      .post(resolvePath())
      .set(authHeaders(TEST_USER_ID))
      .send({ feed_guid: seeded.resolveNotFoundGuid, feed_url: null });
    expect(notFound.status).toBe(200);
    expect(notFound.body.kind).toBe('not_found');
    expect(await channelStubForRef(seeded.resolveNotFoundGuid)).toBeNull();

    providerMocks.resolveFeedsByGuid.mockResolvedValueOnce({
      status: 'found',
      value: new Map<string, IndexProviderFeed>([
        [
          seeded.resolveDeadGuid.toLowerCase(),
          {
            indexProvider: 'podcast_index',
            providerFeedId: seeded.resolveDeadProviderFeedId,
            feedGuid: seeded.resolveDeadGuid.toLowerCase(),
            feedUrl: seeded.resolveDeadFeedUrl,
            title: 'Dead feed',
            author: null,
            description: null,
            imageUrl: null,
            medium: 'podcast',
            isDead: true,
          },
        ],
      ]),
    });
    const dead = await request(requireApp())
      .post(resolvePath())
      .set(authHeaders(TEST_USER_ID))
      .send({ feed_guid: seeded.resolveDeadGuid, feed_url: null });
    expect(dead.status).toBe(200);
    expect(dead.body.kind).toBe('not_found');
    expect(await channelStubForRef(seeded.resolveDeadGuid)).toBeNull();
  });

  it('resolve returns 503 for provider unavailable and does not write a stub', async () => {
    const seeded = requireWorld();
    providerMocks.resolveFeedsByGuid.mockResolvedValueOnce({ status: 'unavailable' });

    const response = await request(requireApp())
      .post(resolvePath())
      .set(authHeaders(TEST_USER_ID))
      .send({ feed_guid: seeded.resolveUnavailableGuid, feed_url: null });

    expect(response.status).toBe(503);
    expect(response.body.message).toBe('Index provider unavailable');
    expect(await channelStubForRef(seeded.resolveUnavailableGuid)).toBeNull();
  });

  it('returns 400 for invalid ref shapes and rejects credential-bearing payloads', async () => {
    const seeded = requireWorld();

    const noKey = await request(requireApp())
      .post(resolvePath())
      .set(authHeaders(TEST_USER_ID))
      .send({ feed_guid: null, feed_url: null });
    expect(noKey.status).toBe(400);

    const withCredentials = await request(requireApp())
      .post(resolvePath())
      .set(authHeaders(TEST_USER_ID))
      .send({
        feed_guid: seeded.unresolvedGuidForValidation,
        feed_url: null,
        username: 'user',
        password: 'pass',
      });
    expect(withCredentials.status).toBe(400);

    const withItemGuid = await request(requireApp())
      .post(resolvePath())
      .set(authHeaders(TEST_USER_ID))
      .send({
        feed_guid: seeded.unresolvedGuidForValidation,
        feed_url: null,
        item_guid: 'item-guid',
      });
    expect(withItemGuid.status).toBe(400);

    const withUserinfoUrl = await request(requireApp())
      .post(resolvePath())
      .set(authHeaders(TEST_USER_ID))
      .send({
        feed_guid: null,
        feed_url: 'https://user:secret@feeds.example.com/feed.xml',
      });
    expect(withUserinfoUrl.status).toBe(400);

    const lookupWithCredentials = await request(requireApp())
      .post(lookupPath())
      .set(authHeaders(TEST_USER_ID))
      .send({
        refs: [
          {
            feed_guid: seeded.unresolvedGuidForValidation,
            feed_url: null,
            item_guid: null,
            credentials: { username: 'u', password: 'p' },
          },
        ],
      });
    expect(lookupWithCredentials.status).toBe(400);

    const lookupWithUserinfo = await request(requireApp())
      .post(lookupPath())
      .set(authHeaders(TEST_USER_ID))
      .send({
        refs: [
          {
            feed_guid: null,
            feed_url: 'https://user:secret@feeds.example.com/feed.xml',
            item_guid: null,
          },
        ],
      });
    expect(lookupWithUserinfo.status).toBe(400);

    expect(providerMocks.resolveFeedsByGuid).not.toHaveBeenCalled();
    expect(providerMocks.resolveFeed).not.toHaveBeenCalled();
    expect(providerMocks.resolveItem).not.toHaveBeenCalled();
    expect(await channelStubForRef(seeded.unresolvedGuidForValidation)).toBeNull();
  });
});
