import type { Express } from 'express';
import type { Server } from 'http';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { MediumEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import { getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

const podcastIndexMocks = vi.hoisted(() => {
  const throwOnCall = async (): Promise<never> => {
    throw new Error('Podcast Index must not be called by channel remote item list responses');
  };
  return {
    podcastsBatchByFeedGuid: vi.fn(throwOnCall),
    podcastGetByFeedUrl: vi.fn(throwOnCall),
    episodeGetByGuid: vi.fn(throwOnCall),
  };
});

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
  };
});

vi.mock('../factories/podcastIndexService.js', () => ({
  podcastIndexService: {
    podcastsBatchByFeedGuid: podcastIndexMocks.podcastsBatchByFeedGuid,
    podcastGetByFeedUrl: podcastIndexMocks.podcastGetByFeedUrl,
    episodeGetByGuid: podcastIndexMocks.episodeGetByGuid,
  },
}));

type SeededChannel = {
  feedId: number;
  channelId: number;
  idText: string;
  podcastGuid: string;
  feedUrl: string;
};

type SeededWorld = {
  list: SeededChannel;
  trackIdText: string;
  stubProviderFeedId: string;
  stubItemGuid: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function records(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const result: Record<string, unknown>[] = [];
  for (const row of value) {
    if (isRecord(row)) {
      result.push(row);
    }
  }
  return result;
}

function bodyField(body: unknown, key: string): unknown {
  if (!isRecord(body)) {
    return undefined;
  }
  return body[key];
}

function idTexts(value: unknown): string[] {
  const result: string[] = [];
  for (const row of records(value)) {
    if (typeof row.id_text === 'string') {
      result.push(row.id_text);
    }
  }
  return result;
}

let seed = 0;

function nextRunId(): number {
  seed += 1;
  return Date.now() + seed;
}

function podcastIndexId(runId: number, slot: number): number {
  return 2_146_500_000 + (runId % 100_000) * 3 + slot;
}

describe('channel remote item list returns parsed rows and remote stubs', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: Express | undefined;
  let base = '';
  let world: SeededWorld | undefined;
  const seededFeedIds: number[] = [];

  function requireApp(): Express {
    if (!app) {
      throw new Error('test app required');
    }
    return app;
  }

  function requireManager(): EntityManager {
    if (!ormContext) {
      throw new Error('ORM context required');
    }
    return ormContext.dataSourceReadWrite.manager;
  }

  function requireWorld(): SeededWorld {
    if (!world) {
      throw new Error('seeded world required');
    }
    return world;
  }

  async function seedChannel(
    manager: EntityManager,
    runId: number,
    slot: number,
    role: string,
    mediumId: number
  ): Promise<SeededChannel> {
    const { Channel, Feed } = await import('@podverse/orm');
    const feedUrl = `https://remote-item-list-${runId}.example.com/${role}.xml`;
    const feedRepo = manager.getRepository(Feed);
    const feed = await feedRepo.save(
      feedRepo.create({
        url: feedUrl,
        podcast_index_id: podcastIndexId(runId, slot),
      })
    );
    seededFeedIds.push(feed.id);
    await manager.query(`INSERT INTO feed_log (feed_id) VALUES ($1)`, [feed.id]);
    await manager.query(
      `INSERT INTO feed_policy (feed_id, parse_allowed, public_visible, add_allowed)
       VALUES ($1, true, true, true)`,
      [feed.id]
    );

    const channelRepo = manager.getRepository(Channel);
    const podcastGuid = crypto.randomUUID();
    const channel = await channelRepo.save(
      channelRepo.create({
        feed_id: feed.id,
        medium_id: mediumId,
        title: `Remote item list ${role} ${runId}`,
        podcast_guid: podcastGuid,
      })
    );
    await manager.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [channel.id]);

    return {
      feedId: feed.id,
      channelId: channel.id,
      idText: channel.id_text,
      podcastGuid,
      feedUrl,
    };
  }

  async function seedWorldState(manager: EntityManager): Promise<SeededWorld> {
    const { Item, ItemFlagStatusStatusEnum, RemoteChannelStubService, RemoteItemStubService } =
      await import('@podverse/orm');
    const runId = nextRunId();
    const list = await seedChannel(manager, runId, 0, 'list', MediumEnum.MusicL);
    const album = await seedChannel(manager, runId, 1, 'album', MediumEnum.Music);

    const trackGuid = `https://remote-item-list-${runId}.example.com/track`;
    const itemRepo = manager.getRepository(Item);
    const track = await itemRepo.save(
      itemRepo.create({
        channel_id: String(album.channelId),
        title: `Remote item list track ${runId}`,
        item_flag_status: { id: ItemFlagStatusStatusEnum.Active },
        guid: trackGuid,
        pub_date: new Date('2026-04-01T00:00:00.000Z'),
      })
    );

    const stubProviderFeedId = String(podcastIndexId(runId, 2));
    const stubFeedGuid = crypto.randomUUID();
    const stubFeedUrl = `https://remote-item-list-${runId}.example.com/stub.xml`;
    const stubItemGuid = `https://remote-item-list-${runId}.example.com/stub-item`;
    const unknownFeedGuid = crypto.randomUUID();
    const unknownFeedUrl = `https://remote-item-list-${runId}.example.com/unknown.xml`;

    await manager.query(
      `INSERT INTO channel_remote_item
       (channel_id, feed_guid, feed_url, item_guid, title, medium_id)
       VALUES ($1, $2, $3, $4, 'Parsed track', $5)`,
      [list.channelId, album.podcastGuid, album.feedUrl, trackGuid, MediumEnum.Music]
    );
    await manager.query(
      `INSERT INTO channel_remote_item
       (channel_id, feed_guid, feed_url, item_guid, title, medium_id)
       VALUES ($1, $2, $3, $4, 'Stubbed item', $5)`,
      [list.channelId, stubFeedGuid, stubFeedUrl, stubItemGuid, MediumEnum.Music]
    );
    await manager.query(
      `INSERT INTO channel_remote_item
       (channel_id, feed_guid, feed_url, item_guid, title, medium_id)
       VALUES ($1, $2, $3, NULL, 'Stubbed feed', $4)`,
      [list.channelId, stubFeedGuid, stubFeedUrl, MediumEnum.Music]
    );
    await manager.query(
      `INSERT INTO channel_remote_item
       (channel_id, feed_guid, feed_url, item_guid, title, medium_id)
       VALUES ($1, $2, $3, NULL, 'Unknown feed', $4)`,
      [list.channelId, unknownFeedGuid, unknownFeedUrl, MediumEnum.Music]
    );

    const remoteChannelStubService = new RemoteChannelStubService();
    const remoteItemStubService = new RemoteItemStubService();
    const channelStub = await remoteChannelStubService.upsertChannelStub(
      {
        indexProvider: 'podcast_index',
        providerFeedId: stubProviderFeedId,
        feedGuid: stubFeedGuid,
        feedUrl: stubFeedUrl,
        title: 'Stubbed Feed',
        author: 'Remote Item Stub Author',
        description: null,
        imageUrl: 'https://remote-item-list.example.com/stub-art.jpg',
        medium: 'music',
        isDead: false,
      },
      [{ feedGuid: stubFeedGuid, feedUrl: stubFeedUrl }]
    );
    await remoteItemStubService.upsertItemStub(channelStub, {
      indexProvider: 'podcast_index',
      providerFeedId: stubProviderFeedId,
      providerItemId: '16795091',
      itemGuid: stubItemGuid,
      title: 'Stubbed Track',
      imageUrl: null,
      pubDate: new Date('2026-03-01T12:00:00.000Z'),
      durationSeconds: 180,
    });

    return {
      list,
      trackIdText: track.id_text,
      stubProviderFeedId,
      stubItemGuid,
    };
  }

  beforeAll(async () => {
    const started = await startTestApp();
    server = started.server;
    ormContext = started.ormContext;
    app = started.app;
    base = await getBaseApiUrl();
    world = await seedWorldState(requireManager());
  }, 120000);

  afterAll(async () => {
    if (ormContext) {
      const seeded = world;
      if (seeded) {
        await ormContext.dataSourceReadWrite.query(
          `DELETE FROM remote_channel_stub
           WHERE index_provider = 'podcast_index' AND provider_feed_id = $1`,
          [seeded.stubProviderFeedId]
        );
      }
      if (seededFeedIds.length > 0) {
        await ormContext.dataSourceReadWrite.query(`DELETE FROM feed WHERE id = ANY($1::int[])`, [
          seededFeedIds,
        ]);
      }
    }
    await stopTestApp(server, ormContext);
  });

  it('returns the parsed track and matching stubs, and leaves the unknown ref out', async () => {
    const seeded = requireWorld();
    const response = await request(requireApp()).get(
      `${base}/remote-item/channel/${seeded.list.idText}`
    );

    expect(response.status).toBe(200);
    const body: unknown = response.body;

    expect(idTexts(bodyField(body, 'itemsAdded'))).toEqual([seeded.trackIdText]);
    const itemsUnadded = records(bodyField(body, 'itemsUnadded'));
    expect(itemsUnadded).toHaveLength(1);
    expect(bodyField(itemsUnadded[0], 'item_guid')).toBe(seeded.stubItemGuid);
    expect(bodyField(bodyField(itemsUnadded[0], 'channel_stub'), 'provider_feed_id')).toBe(
      seeded.stubProviderFeedId
    );

    expect(bodyField(body, 'channelsAdded')).toEqual([]);
    const channelsUnadded = records(bodyField(body, 'channelsUnadded'));
    expect(channelsUnadded).toHaveLength(1);
    expect(bodyField(channelsUnadded[0], 'provider_feed_id')).toBe(seeded.stubProviderFeedId);

    expect(podcastIndexMocks.podcastsBatchByFeedGuid).not.toHaveBeenCalled();
    expect(podcastIndexMocks.podcastGetByFeedUrl).not.toHaveBeenCalled();
    expect(podcastIndexMocks.episodeGetByGuid).not.toHaveBeenCalled();
  });

  it('returns four empty arrays for an unknown channel', async () => {
    const response = await request(requireApp()).get(`${base}/remote-item/channel/doesNotExist1`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      channelsAdded: [],
      channelsUnadded: [],
      itemsAdded: [],
      itemsUnadded: [],
    });
  });
});
