import type { Express } from 'express';
import type { Server } from 'http';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { MediumEnum } from '@podverse/helpers';
import type { ChannelVerifiedPublisherService, ORMContext } from '@podverse/orm';

import { getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

const podcastIndexMocks = vi.hoisted(() => {
  const throwOnCall = async (): Promise<never> => {
    throw new Error('Podcast Index must not be called by publisher-feed verified endpoint');
  };
  return {
    episodeGetByGuid: vi.fn(throwOnCall),
    podcastGetByFeedUrl: vi.fn(throwOnCall),
    podcastsBatchByFeedGuid: vi.fn(throwOnCall),
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
  title: string;
  mediumId: number;
  podcastGuid: string;
  feedUrl: string;
};

type SeededWorld = {
  artist: SeededChannel;
  albumA: SeededChannel;
  albumB: SeededChannel;
  newerItemIdText: string;
  olderItemIdText: string;
  knownUnparsedGuid: string;
  knownUnparsedFeedUrl: string;
  unknownUnparsedGuid: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function records(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: Record<string, unknown>[] = [];
  for (const entry of value) {
    if (isRecord(entry)) {
      rows.push(entry);
    }
  }
  return rows;
}

function bodyField(body: unknown, key: string): unknown {
  if (!isRecord(body)) {
    return undefined;
  }
  return body[key];
}

function idTexts(value: unknown): string[] {
  const texts: string[] = [];
  for (const row of records(value)) {
    if (typeof row.id_text === 'string') {
      texts.push(row.id_text);
    }
  }
  return texts;
}

function lowerFeedGuids(value: unknown): string[] {
  const guids: string[] = [];
  for (const row of records(value)) {
    if (typeof row.feed_guid === 'string') {
      guids.push(row.feed_guid.toLowerCase());
    }
  }
  return guids;
}

/** Fresh per run so a cached Podcast Index feed for one guid cannot satisfy another run. */
let seed = 0;

function nextRunId(): number {
  seed += 1;
  return Date.now() + seed;
}

function podcastIndexId(runId: number, slot: number): number {
  return 1_500_000_000 + (runId % 10_000_000) * 4 + slot;
}

const KNOWN_UNPARSED_PROVIDER_FEED_ID = '880001';

describe('publisher feed verified albums and tracks', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: Express | undefined;
  let base = '';
  let world: SeededWorld | undefined;
  let verifiedPublisherService: ChannelVerifiedPublisherService | undefined;
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
      throw new Error('seeded channels required');
    }
    return world;
  }

  function requireVerifiedPublisherService(): ChannelVerifiedPublisherService {
    if (!verifiedPublisherService) {
      throw new Error('verified publisher service required');
    }
    return verifiedPublisherService;
  }

  async function seedChannel(
    manager: EntityManager,
    runId: number,
    slot: number,
    role: 'artist' | 'album-a' | 'album-b',
    mediumId: number
  ): Promise<SeededChannel> {
    const { Channel, Feed } = await import('@podverse/orm');
    const title = `Publisher feed ${role} ${runId}`;
    const feedUrl = `https://publisher-feed-verified-${runId}.example.com/${role}.xml`;
    const podcastGuid = crypto.randomUUID();
    const feedRepo = manager.getRepository(Feed);
    const feed = await feedRepo.save(
      feedRepo.create({
        url: feedUrl,
        podcast_index_id: podcastIndexId(runId, slot),
      })
    );
    seededFeedIds.push(feed.id);
    const channelRepo = manager.getRepository(Channel);
    const channel = await channelRepo.save(
      channelRepo.create({
        feed_id: feed.id,
        medium_id: mediumId,
        title,
        podcast_guid: podcastGuid,
      })
    );
    await manager.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [channel.id]);
    return {
      feedId: feed.id,
      channelId: channel.id,
      idText: channel.id_text,
      title,
      mediumId,
      podcastGuid,
      feedUrl,
    };
  }

  async function seedWorld(manager: EntityManager): Promise<SeededWorld> {
    const { Item } = await import('@podverse/orm');
    const runId = nextRunId();
    const artist = await seedChannel(manager, runId, 0, 'artist', MediumEnum.PublisherMusic);
    const albumA = await seedChannel(manager, runId, 1, 'album-a', MediumEnum.Music);
    const albumB = await seedChannel(manager, runId, 2, 'album-b', MediumEnum.Music);
    const itemRepo = manager.getRepository(Item);
    const newerGuid = `https://publisher-feed-verified-${runId}.example.com/newer`;
    const newer = await itemRepo.save(
      itemRepo.create({
        channel_id: String(albumA.channelId),
        title: `Publisher feed newer ${runId}`,
        item_flag_status: { id: 1 },
        guid: newerGuid,
        pub_date: new Date('2026-06-02T00:00:00.000Z'),
      })
    );
    const older = await itemRepo.save(
      itemRepo.create({
        channel_id: String(albumA.channelId),
        title: `Publisher feed older ${runId}`,
        item_flag_status: { id: 1 },
        guid: `https://publisher-feed-verified-${runId}.example.com/older`,
        pub_date: new Date('2026-01-02T00:00:00.000Z'),
      })
    );
    const knownUnparsedGuid = crypto.randomUUID();
    const knownUnparsedFeedUrl = `https://publisher-feed-verified-${runId}.example.com/unparsed-c.xml`;
    const unknownUnparsedGuid = crypto.randomUUID();
    await manager.query(
      `WITH publisher AS (
         INSERT INTO channel_publisher (channel_id) VALUES ($1) RETURNING id
       )
       INSERT INTO channel_publisher_remote_item (
         channel_publisher_id, feed_guid, feed_url, item_guid, title, medium_id
       )
       SELECT publisher.id, $2, $3, NULL, $4, $5
       FROM publisher`,
      [
        albumA.channelId,
        artist.podcastGuid,
        artist.feedUrl,
        artist.title,
        MediumEnum.PublisherMusic,
      ]
    );
    await manager.query(
      `INSERT INTO channel_remote_item (channel_id, feed_guid, feed_url, item_guid, title, medium_id)
       VALUES
         ($1, $2, $3, NULL, 'Album A', $4),
         ($1, $5, $6, NULL, 'Album B', $4),
         ($1, $7, $8, NULL, 'Album C', $4),
         ($1, $9, $10, NULL, 'Album D', $4),
         ($1, $2, $3, $11, 'Track on A', $4)`,
      [
        artist.channelId,
        albumA.podcastGuid,
        albumA.feedUrl,
        MediumEnum.Music,
        albumB.podcastGuid,
        albumB.feedUrl,
        knownUnparsedGuid,
        knownUnparsedFeedUrl,
        unknownUnparsedGuid,
        `https://publisher-feed-verified-${runId}.example.com/unparsed-d.xml`,
        newerGuid,
      ]
    );
    return {
      artist,
      albumA,
      albumB,
      newerItemIdText: newer.id_text,
      olderItemIdText: older.id_text,
      knownUnparsedGuid,
      knownUnparsedFeedUrl,
      unknownUnparsedGuid,
    };
  }

  beforeAll(async () => {
    const started = await startTestApp();
    server = started.server;
    ormContext = started.ormContext;
    app = started.app;
    if (!ormContext) {
      throw new Error('ORM context required for publisher feed verified test');
    }
    base = await getBaseApiUrl();
    const orm = await import('@podverse/orm');
    verifiedPublisherService = new orm.ChannelVerifiedPublisherService();
    world = await seedWorld(ormContext.dataSourceReadWrite.manager);
    await new orm.RemoteChannelStubService().upsertChannelStub(
      {
        indexProvider: 'podcast_index',
        providerFeedId: KNOWN_UNPARSED_PROVIDER_FEED_ID,
        feedGuid: world.knownUnparsedGuid,
        feedUrl: world.knownUnparsedFeedUrl,
        title: 'Known unparsed album',
        author: null,
        description: null,
        imageUrl: null,
        medium: 'music',
        isDead: false,
      },
      [{ feedGuid: world.knownUnparsedGuid, feedUrl: world.knownUnparsedFeedUrl }]
    );
  }, 120000);

  afterAll(async () => {
    if (ormContext) {
      await ormContext.dataSourceReadWrite.query(
        `DELETE FROM remote_channel_stub
         WHERE index_provider = 'podcast_index' AND provider_feed_id = $1`,
        [KNOWN_UNPARSED_PROVIDER_FEED_ID]
      );
      if (seededFeedIds.length > 0) {
        await ormContext.dataSourceReadWrite.query(`DELETE FROM feed WHERE id = ANY($1::int[])`, [
          seededFeedIds,
        ]);
      }
    }
    await stopTestApp(server, ormContext);
  });

  it('lists the verified album and its tracks, then drops the album when the claim is removed', async () => {
    const seeded = requireWorld();
    const artistPublisher = {
      id_text: seeded.artist.idText,
      title: seeded.artist.title,
      medium_id: seeded.artist.mediumId,
    };
    await requireVerifiedPublisherService().recomputeForChannel(seeded.artist.channelId);

    const listed = await request(requireApp()).get(
      `${base}/publisher-feed/channel/${seeded.artist.idText}`
    );
    expect(listed.status).toBe(200);
    const listedBody: unknown = listed.body;
    expect(idTexts(bodyField(listedBody, 'channelsAdded'))).toEqual([seeded.albumA.idText]);
    expect(
      bodyField(records(bodyField(listedBody, 'channelsAdded'))[0], 'verified_publishers')
    ).toEqual([artistPublisher]);
    const listedUnadded = records(bodyField(listedBody, 'channelsUnadded'));
    expect(listedUnadded).toHaveLength(1);
    expect(bodyField(listedUnadded[0], 'is_remote_stub')).toBe(true);
    expect(lowerFeedGuids(listedUnadded)).toEqual([
      seeded.knownUnparsedGuid.toLowerCase(),
    ]);
    expect(idTexts(bodyField(listedBody, 'itemsAdded'))).toEqual([
      seeded.newerItemIdText,
      seeded.olderItemIdText,
    ]);
    const addedItems = records(bodyField(listedBody, 'itemsAdded'));
    expect(bodyField(addedItems[0]?.channel, 'verified_publishers')).toEqual([artistPublisher]);
    expect(bodyField(addedItems[1]?.channel, 'verified_publishers')).toEqual([artistPublisher]);
    expect(bodyField(listedBody, 'itemsUnadded')).toEqual([]);

    await requireManager().query(
      `DELETE FROM channel_publisher_remote_item
       WHERE channel_publisher_id IN (
         SELECT id FROM channel_publisher WHERE channel_id = $1
       )`,
      [seeded.albumA.channelId]
    );
    await requireVerifiedPublisherService().recomputeForChannel(seeded.albumA.channelId);

    const dropped = await request(requireApp()).get(
      `${base}/publisher-feed/channel/${seeded.artist.idText}`
    );
    expect(dropped.status).toBe(200);
    const droppedBody: unknown = dropped.body;
    expect(idTexts(bodyField(droppedBody, 'channelsAdded'))).toEqual([]);
    const droppedUnadded = records(bodyField(droppedBody, 'channelsUnadded'));
    expect(droppedUnadded).toHaveLength(1);
    expect(bodyField(droppedUnadded[0], 'is_remote_stub')).toBe(true);
    expect(lowerFeedGuids(droppedUnadded)).toEqual([
      seeded.knownUnparsedGuid.toLowerCase(),
    ]);
    expect(idTexts(bodyField(droppedBody, 'itemsAdded'))).toEqual([]);
    expect(bodyField(droppedBody, 'itemsUnadded')).toEqual([]);
    expect(podcastIndexMocks.podcastsBatchByFeedGuid).not.toHaveBeenCalled();
    expect(podcastIndexMocks.podcastGetByFeedUrl).not.toHaveBeenCalled();
    expect(podcastIndexMocks.episodeGetByGuid).not.toHaveBeenCalled();
  });
});
