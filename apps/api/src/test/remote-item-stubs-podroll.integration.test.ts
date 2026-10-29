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
    throw new Error('Podcast Index must not be called by podroll stub responses');
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
  source: SeededChannel;
  parsedByGuid: SeededChannel;
  parsedByUrl: SeededChannel;
  stubProviderFeedId: string;
  stubFeedGuid: string;
  stubFeedUrl: string;
  knownStubItemGuid: string;
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
  return 2_145_000_000 + (runId % 100_000) * 4 + slot;
}

describe('podroll returns remote stubs and hides unknown references', () => {
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
    role: string
  ): Promise<SeededChannel> {
    const { Channel, Feed } = await import('@podverse/orm');
    const feedUrl = `https://podroll-stubs-${runId}.example.com/${role}.xml`;
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
        medium_id: MediumEnum.Podcast,
        title: `Podroll ${role} ${runId}`,
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
    const { RemoteChannelStubService, RemoteItemStubService } = await import('@podverse/orm');
    const runId = nextRunId();
    const source = await seedChannel(manager, runId, 0, 'source');
    const parsedByGuid = await seedChannel(manager, runId, 1, 'parsed-guid');
    const parsedByUrl = await seedChannel(manager, runId, 2, 'parsed-url');

    const stubProviderFeedId = String(podcastIndexId(runId, 3));
    const stubFeedGuid = crypto.randomUUID();
    const stubFeedUrl = `https://podroll-stubs-${runId}.example.com/stub.xml`;
    const knownStubItemGuid = `https://podroll-stubs-${runId}.example.com/stub-item-known`;
    const missingStubItemGuid = `https://podroll-stubs-${runId}.example.com/stub-item-missing`;
    const unknownFeedGuid = crypto.randomUUID();
    const parsedChannelMissingItemGuid = `https://podroll-stubs-${runId}.example.com/parsed-item-missing`;

    const podroll = await manager.query(
      `INSERT INTO channel_podroll (channel_id)
       VALUES ($1)
       RETURNING id`,
      [source.channelId]
    );
    const podrollId = Number(podroll[0]?.id);
    if (!Number.isSafeInteger(podrollId)) {
      throw new Error('missing channel_podroll id');
    }

    await manager.query(
      `INSERT INTO channel_podroll_remote_item
       (channel_podroll_id, feed_guid, feed_url, item_guid, title, medium_id)
       VALUES
       ($1, $2, $3, NULL, 'Parsed by GUID', $4),
       ($1, $5, $6, NULL, 'Parsed by URL', $4),
       ($1, $7, $8, NULL, 'Stubbed feed', $4),
       ($1, $9, NULL, NULL, 'Unknown feed', $4),
       ($1, $7, $8, $10, 'Stub item known', $4),
       ($1, $7, $8, $11, 'Stub item missing', $4),
       ($1, $2, $3, $12, 'Parsed feed item missing', $4)`,
      [
        podrollId,
        parsedByGuid.podcastGuid,
        parsedByGuid.feedUrl,
        MediumEnum.Podcast,
        crypto.randomUUID(),
        parsedByUrl.feedUrl,
        stubFeedGuid,
        stubFeedUrl,
        unknownFeedGuid,
        knownStubItemGuid,
        missingStubItemGuid,
        parsedChannelMissingItemGuid,
      ]
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
        author: 'Podroll Stub Author',
        description: null,
        imageUrl: 'https://podroll-stubs.example.com/stub-art.jpg',
        medium: 'podcast',
        isDead: false,
      },
      [{ feedGuid: stubFeedGuid, feedUrl: stubFeedUrl }]
    );
    await remoteItemStubService.upsertItemStub(channelStub, {
      indexProvider: 'podcast_index',
      providerFeedId: stubProviderFeedId,
      providerItemId: '16795090',
      itemGuid: knownStubItemGuid,
      title: 'Stubbed Episode',
      imageUrl: null,
      pubDate: new Date('2026-03-01T12:00:00.000Z'),
      durationSeconds: 3723,
    });

    return {
      source,
      parsedByGuid,
      parsedByUrl,
      stubProviderFeedId,
      stubFeedGuid,
      stubFeedUrl,
      knownStubItemGuid,
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

  it('returns parsed rows plus matching stubs and leaves unknown refs out', async () => {
    const seeded = requireWorld();
    const response = await request(requireApp()).get(
      `${base}/podroll/channel/${seeded.source.idText}`
    );

    expect(response.status).toBe(200);
    const body: unknown = response.body;

    expect(idTexts(bodyField(body, 'channelsAdded'))).toEqual([
      seeded.parsedByGuid.idText,
      seeded.parsedByUrl.idText,
    ]);

    const channelsUnadded = records(bodyField(body, 'channelsUnadded'));
    expect(channelsUnadded).toHaveLength(1);
    expect(bodyField(channelsUnadded[0], 'is_remote_stub')).toBe(true);
    expect(bodyField(channelsUnadded[0], 'provider_feed_id')).toBe(seeded.stubProviderFeedId);
    expect(bodyField(channelsUnadded[0], 'feed_guid')).toBe(seeded.stubFeedGuid);
    expect(bodyField(channelsUnadded[0], 'feed_url')).toBe(seeded.stubFeedUrl);

    expect(bodyField(body, 'itemsAdded')).toEqual([]);
    const itemsUnadded = records(bodyField(body, 'itemsUnadded'));
    expect(itemsUnadded).toHaveLength(1);
    expect(bodyField(itemsUnadded[0], 'item_guid')).toBe(seeded.knownStubItemGuid);
    expect(
      bodyField(bodyField(itemsUnadded[0], 'channel_stub'), 'provider_feed_id')
    ).toBe(seeded.stubProviderFeedId);

    expect(podcastIndexMocks.podcastsBatchByFeedGuid).not.toHaveBeenCalled();
    expect(podcastIndexMocks.podcastGetByFeedUrl).not.toHaveBeenCalled();
    expect(podcastIndexMocks.episodeGetByGuid).not.toHaveBeenCalled();
  });

  it('does not expose stubs from regular channel lookup routes', async () => {
    const seeded = requireWorld();
    const response = await request(requireApp()).get(
      `${base}/channel/podcast-index/${seeded.stubProviderFeedId}`
    );

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
  });
});
