import { randomUUID } from 'node:crypto';

import type { Express } from 'express';
import type { Server } from 'http';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type {
  DTOLegacyPodcastLookupAnswer,
  DTOLegacyPodcastLookupChannel,
} from '@podverse/helpers';
import { LEGACY_PODCAST_LOOKUP_MAX_IDS, MediumEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import { getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

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

type SeededChannel = {
  feedId: number;
  channelId: number;
  channelIdText: string;
  podcastIndexId: number;
  feedUrl: string;
  title: string;
  imageUrl: string | null;
};

type SeedChannelInput = {
  feedUrl: string;
  title: string;
  withAbout: boolean;
  publicVisible: boolean;
  imageUrl: string | null;
};

const runKey = randomUUID().replaceAll('-', '').slice(0, 6);

function legacyId(slot: string): string {
  return `lp${runKey}${slot}`;
}

function httpsFeedUrl(): string {
  return `https://legacy-podcast-lookup-${randomUUID()}.example.com/feed.xml`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLookupChannel(value: unknown): value is DTOLegacyPodcastLookupChannel {
  if (!isRecord(value)) {
    return false;
  }
  const { id_text, title, medium_id, image_url } = value;
  return (
    typeof id_text === 'string' &&
    (title === null || typeof title === 'string') &&
    (medium_id === null || typeof medium_id === 'number') &&
    (image_url === null || typeof image_url === 'string')
  );
}

function readAnswer(value: unknown): DTOLegacyPodcastLookupAnswer | null {
  if (!isRecord(value) || typeof value.podcast_id !== 'string') {
    return null;
  }
  const podcastId = value.podcast_id;
  if (value.kind === 'blocked') {
    return { podcast_id: podcastId, kind: 'blocked' };
  }
  if (value.kind === 'not_here') {
    return { podcast_id: podcastId, kind: 'not_here' };
  }
  if (value.kind === 'feed_url' && typeof value.feed_url === 'string') {
    return { podcast_id: podcastId, kind: 'feed_url', feed_url: value.feed_url };
  }
  if (value.kind === 'channel' && isLookupChannel(value.channel)) {
    return { podcast_id: podcastId, kind: 'channel', channel: value.channel };
  }
  return null;
}

function readAnswers(body: unknown): DTOLegacyPodcastLookupAnswer[] {
  if (!isRecord(body) || !Array.isArray(body.answers)) {
    throw new Error('lookup response required');
  }
  const answers: DTOLegacyPodcastLookupAnswer[] = [];
  for (const entry of body.answers) {
    const answer = readAnswer(entry);
    if (answer === null) {
      throw new Error('lookup answer required');
    }
    answers.push(answer);
  }
  return answers;
}

let podcastIndexSlot = 0;

function nextPodcastIndexId(): number {
  podcastIndexSlot += 1;
  const hex = randomUUID().replaceAll('-', '').slice(0, 6);
  const parsed = Number.parseInt(hex, 16) % 200_000_000;
  return 1_700_000_000 + parsed + podcastIndexSlot;
}

describe('POST /legacy/podcast/lookup', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: Express | undefined;
  let base = '';
  const seededFeedIds: number[] = [];
  const seededLegacyIds: string[] = [];
  const seededMergeIds: number[] = [];

  function requireManager(): EntityManager {
    if (!ormContext) {
      throw new Error('ORM context required');
    }
    return ormContext.dataSourceReadWrite.manager;
  }

  function requireApp(): Express {
    if (!app) {
      throw new Error('test app required');
    }
    return app;
  }

  async function seedChannel(input: SeedChannelInput): Promise<SeededChannel> {
    const manager = requireManager();
    const { Channel, Feed } = await import('@podverse/orm');
    const podcastIndexId = nextPodcastIndexId();
    const feedRepo = manager.getRepository(Feed);
    const feed = await feedRepo.save(
      feedRepo.create({
        url: input.feedUrl,
        podcast_index_id: podcastIndexId,
      })
    );
    seededFeedIds.push(feed.id);
    const channelRepo = manager.getRepository(Channel);
    const channel = await channelRepo.save(
      channelRepo.create({
        feed_id: feed.id,
        medium_id: MediumEnum.Podcast,
        title: input.title,
        podcast_guid: null,
      })
    );
    await manager.query(
      `INSERT INTO feed_policy (feed_id, parse_allowed, public_visible, add_allowed)
       VALUES ($1, true, $2, true)`,
      [feed.id, input.publicVisible]
    );
    if (input.withAbout) {
      await manager.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [channel.id]);
    }
    if (input.imageUrl !== null) {
      await manager.query(
        `INSERT INTO channel_image (channel_id, url, image_width_size, is_resized)
         VALUES ($1, $2, 140, false)`,
        [channel.id, input.imageUrl]
      );
    }
    return {
      feedId: feed.id,
      channelId: channel.id,
      channelIdText: channel.id_text,
      podcastIndexId,
      feedUrl: input.feedUrl,
      title: input.title,
      imageUrl: input.imageUrl,
    };
  }

  async function setLifecycle(feedId: number, stateKey: string): Promise<void> {
    await requireManager().query(
      `UPDATE feed_lifecycle_state
       SET feed_lifecycle_state_type_id = (
         SELECT id FROM feed_lifecycle_state_type WHERE state_key = $2
       )
       WHERE feed_id = $1`,
      [feedId, stateKey]
    );
  }

  async function insertMapRow(input: {
    legacyId: string;
    status: 'mapped' | 'unresolved' | 'dropped';
    v5IdText: string | null;
    resolveKey: string | null;
    v4FeedUrl: string | null;
  }): Promise<void> {
    const { LegacyIdMap } = await import('@podverse/orm');
    const repo = requireManager().getRepository(LegacyIdMap);
    seededLegacyIds.push(input.legacyId);
    await repo.save(
      repo.create({
        legacy_kind: 'podcast',
        legacy_id: input.legacyId,
        v5_kind: 'channel',
        v5_id_text: input.v5IdText,
        resolve_key: input.resolveKey,
        v4_feed_url: input.v4FeedUrl,
        status: input.status,
      })
    );
  }

  async function lookup(
    podcastIds: string[],
    installId: string | null = null
  ): Promise<DTOLegacyPodcastLookupAnswer[]> {
    const http = request(requireApp()).post(`${base}/legacy/podcast/lookup`);
    if (installId !== null) {
      http.set('X-Podverse-Install-Id', installId);
    }
    const response = await http.send({ podcast_ids: podcastIds });
    expect(response.status).toBe(200);
    return readAnswers(response.body);
  }

  beforeAll(async () => {
    const started = await startTestApp();
    server = started.server;
    ormContext = started.ormContext;
    app = started.app;
    if (!ormContext) {
      throw new Error('ORM context required for legacy podcast lookup');
    }
    base = await getBaseApiUrl();
  }, 120000);

  afterAll(async () => {
    if (ormContext) {
      const db = ormContext.dataSourceReadWrite;
      if (seededMergeIds.length > 0) {
        await db.query(`DELETE FROM channel_merge WHERE id = ANY($1::int[])`, [seededMergeIds]);
      }
      if (seededLegacyIds.length > 0) {
        await db.query(
          `DELETE FROM legacy_id_map
           WHERE legacy_kind = 'podcast' AND legacy_id = ANY($1::text[])`,
          [seededLegacyIds]
        );
      }
      if (seededFeedIds.length > 0) {
        await db.query(`DELETE FROM feed WHERE id = ANY($1::int[])`, [seededFeedIds]);
      }
    }
    await stopTestApp(server, ormContext);
  });

  it('answers each kind in input order, including a duplicate and a trimmed id', async () => {
    const mapped = await seedChannel({
      feedUrl: httpsFeedUrl(),
      title: 'Mapped lookup show',
      withAbout: true,
      publicVisible: true,
      imageUrl: 'https://cdn.example.com/legacy-mapped.jpg',
    });
    const plain = await seedChannel({
      feedUrl: httpsFeedUrl(),
      title: 'Plain lookup show',
      withAbout: true,
      publicVisible: true,
      imageUrl: null,
    });
    const mappedId = legacyId('a');
    const feedOnlyId = legacyId('b');
    const missingId = legacyId('c');
    const droppedId = legacyId('d');
    const trimmedId = legacyId('e');
    const plainId = legacyId('f');
    const feedOnlyUrl = `https://legacy-podcast-lookup-missing-${runKey}.example.com/feed.xml`;
    await insertMapRow({
      legacyId: mappedId,
      status: 'mapped',
      v5IdText: mapped.channelIdText,
      resolveKey: null,
      v4FeedUrl: mapped.feedUrl,
    });
    await insertMapRow({
      legacyId: feedOnlyId,
      status: 'unresolved',
      v5IdText: null,
      resolveKey: null,
      v4FeedUrl: feedOnlyUrl,
    });
    await insertMapRow({
      legacyId: droppedId,
      status: 'dropped',
      v5IdText: null,
      resolveKey: null,
      v4FeedUrl: null,
    });
    await insertMapRow({
      legacyId: plainId,
      status: 'mapped',
      v5IdText: plain.channelIdText,
      resolveKey: null,
      v4FeedUrl: null,
    });

    const answers = await lookup(
      [mappedId, feedOnlyId, mappedId, missingId, droppedId, `  ${trimmedId}  `, plainId],
      'legacy-lookup-test-1'
    );

    expect(answers).toEqual([
      {
        podcast_id: mappedId,
        kind: 'channel',
        channel: {
          id_text: mapped.channelIdText,
          title: mapped.title,
          medium_id: MediumEnum.Podcast,
          image_url: mapped.imageUrl,
        },
      },
      { podcast_id: feedOnlyId, kind: 'feed_url', feed_url: feedOnlyUrl },
      {
        podcast_id: mappedId,
        kind: 'channel',
        channel: {
          id_text: mapped.channelIdText,
          title: mapped.title,
          medium_id: MediumEnum.Podcast,
          image_url: mapped.imageUrl,
        },
      },
      { podcast_id: missingId, kind: 'not_here' },
      { podcast_id: droppedId, kind: 'blocked' },
      { podcast_id: trimmedId, kind: 'not_here' },
      {
        podcast_id: plainId,
        kind: 'channel',
        channel: {
          id_text: plain.channelIdText,
          title: plain.title,
          medium_id: MediumEnum.Podcast,
          image_url: null,
        },
      },
    ]);
  });

  it('returns the merge survivor for a mapped channel', async () => {
    const absorbed = await seedChannel({
      feedUrl: httpsFeedUrl(),
      title: 'Absorbed lookup show',
      withAbout: true,
      publicVisible: true,
      imageUrl: 'https://cdn.example.com/legacy-absorbed.jpg',
    });
    const survivor = await seedChannel({
      feedUrl: httpsFeedUrl(),
      title: 'Survivor lookup show',
      withAbout: true,
      publicVisible: true,
      imageUrl: 'https://cdn.example.com/legacy-survivor.jpg',
    });
    const { ChannelMerge, ChannelMergeMode, ChannelMergeStatus, FeedLifecycleStateKeyEnum } =
      await import('@podverse/orm');
    const manager = requireManager();
    const mergeRepo = manager.getRepository(ChannelMerge);
    const merge = await mergeRepo.save(
      mergeRepo.create({
        from_podcast_index_id: absorbed.podcastIndexId,
        to_podcast_index_id: survivor.podcastIndexId,
        from_channel_id: absorbed.channelId,
        to_channel_id: survivor.channelId,
        mode: ChannelMergeMode.Absorb,
        status: ChannelMergeStatus.Applied,
        match_stats: {},
      })
    );
    seededMergeIds.push(merge.id);
    await setLifecycle(absorbed.feedId, FeedLifecycleStateKeyEnum.Merged);
    const podcastId = legacyId('m');
    await insertMapRow({
      legacyId: podcastId,
      status: 'mapped',
      v5IdText: absorbed.channelIdText,
      resolveKey: null,
      v4FeedUrl: null,
    });

    const answers = await lookup([podcastId]);

    expect(answers).toEqual([
      {
        podcast_id: podcastId,
        kind: 'channel',
        channel: {
          id_text: survivor.channelIdText,
          title: survivor.title,
          medium_id: MediumEnum.Podcast,
          image_url: survivor.imageUrl,
        },
      },
    ]);
  });

  it('uses the feed URL channel when the Podcast Index channel is not public', async () => {
    const hidden = await seedChannel({
      feedUrl: httpsFeedUrl(),
      title: 'Hidden lookup show',
      withAbout: true,
      publicVisible: false,
      imageUrl: null,
    });
    const listed = await seedChannel({
      feedUrl: httpsFeedUrl(),
      title: 'Listed lookup show',
      withAbout: true,
      publicVisible: true,
      imageUrl: 'https://cdn.example.com/legacy-listed.jpg',
    });
    const podcastId = legacyId('p');
    await insertMapRow({
      legacyId: podcastId,
      status: 'unresolved',
      v5IdText: null,
      resolveKey: String(hidden.podcastIndexId),
      v4FeedUrl: listed.feedUrl,
    });

    const answers = await lookup([podcastId]);

    expect(answers).toEqual([
      {
        podcast_id: podcastId,
        kind: 'channel',
        channel: {
          id_text: listed.channelIdText,
          title: listed.title,
          medium_id: MediumEnum.Podcast,
          image_url: listed.imageUrl,
        },
      },
    ]);
  });

  it('returns 400 when more than 2000 ids are sent', async () => {
    const podcastIds = Array.from(
      { length: LEGACY_PODCAST_LOOKUP_MAX_IDS + 1 },
      (_, index) => `x${index}`
    );
    const response = await request(requireApp())
      .post(`${base}/legacy/podcast/lookup`)
      .send({ podcast_ids: podcastIds });

    expect(response.status).toBe(400);
  });
});
