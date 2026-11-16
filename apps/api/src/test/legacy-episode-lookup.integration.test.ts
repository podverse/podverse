import { randomUUID } from 'node:crypto';

import type { Express } from 'express';
import type { Server } from 'http';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type {
  DTOLegacyEpisodeLookupAnswer,
  DTOLegacyEpisodeLookupRef,
  DTOLegacyPodcastLookupChannel,
} from '@podverse/helpers';
import { LEGACY_EPISODE_LOOKUP_MAX_EPISODES, MediumEnum } from '@podverse/helpers';
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

type SeededItem = {
  id: number;
  idText: string;
};

const runKey = randomUUID().replaceAll('-', '').slice(0, 6);

function legacyId(slot: string): string {
  return `le${runKey}${slot}`;
}

function httpsFeedUrl(): string {
  return `https://legacy-episode-lookup-${randomUUID()}.example.com/feed.xml`;
}

function mediaUrl(name: string): string {
  return `https://legacy-episode-${runKey}.example.com/${name}.mp3`;
}

function itemGuid(name: string): string {
  return `legacy-episode-${runKey}-${name}`;
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

function readAnswer(value: unknown): DTOLegacyEpisodeLookupAnswer | null {
  if (!isRecord(value) || typeof value.episode_id !== 'string') {
    return null;
  }
  const episodeId = value.episode_id;
  if (value.kind === 'blocked') {
    return { episode_id: episodeId, kind: 'blocked' };
  }
  if (value.kind === 'not_here') {
    return { episode_id: episodeId, kind: 'not_here' };
  }
  if (value.kind === 'feed_url' && typeof value.feed_url === 'string') {
    return { episode_id: episodeId, kind: 'feed_url', feed_url: value.feed_url };
  }
  if (value.kind === 'channel' && isLookupChannel(value.channel)) {
    return { episode_id: episodeId, kind: 'channel', channel: value.channel };
  }
  if (
    value.kind === 'item' &&
    typeof value.item_id_text === 'string' &&
    isLookupChannel(value.channel)
  ) {
    return {
      episode_id: episodeId,
      kind: 'item',
      item_id_text: value.item_id_text,
      channel: value.channel,
    };
  }
  return null;
}

function readAnswers(body: unknown): DTOLegacyEpisodeLookupAnswer[] {
  if (!isRecord(body) || !Array.isArray(body.answers)) {
    throw new Error('lookup response required');
  }
  const answers: DTOLegacyEpisodeLookupAnswer[] = [];
  for (const entry of body.answers) {
    const answer = readAnswer(entry);
    if (answer === null) {
      throw new Error('lookup answer required');
    }
    answers.push(answer);
  }
  return answers;
}

function channelOf(channel: SeededChannel): DTOLegacyPodcastLookupChannel {
  return {
    id_text: channel.channelIdText,
    title: channel.title,
    medium_id: MediumEnum.Podcast,
    image_url: channel.imageUrl,
  };
}

function episodeRef(
  episodeId: string,
  podcastId: string,
  guid: string | null,
  mediaUrlValue: string | null
): DTOLegacyEpisodeLookupRef {
  return {
    episode_id: episodeId,
    podcast_id: podcastId,
    guid,
    media_url: mediaUrlValue,
  };
}

let podcastIndexSlot = 0;

function nextPodcastIndexId(): number {
  podcastIndexSlot += 1;
  const hex = randomUUID().replaceAll('-', '').slice(0, 6);
  const parsed = Number.parseInt(hex, 16) % 200_000_000;
  return 1_810_000_000 + parsed + podcastIndexSlot;
}

describe('POST /legacy/episode/lookup', () => {
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

  async function seedItem(input: {
    channelId: number;
    guid: string | null;
    enclosureUrl: string | null;
    archived?: boolean;
  }): Promise<SeededItem> {
    const { Item, ItemFlagStatusStatusEnum } = await import('@podverse/orm');
    const repo = requireManager().getRepository(Item);
    const item = await repo.save(
      repo.create({
        channel_id: String(input.channelId),
        guid: input.guid,
        guid_enclosure_url: input.enclosureUrl,
        title: 'Legacy episode lookup item',
        pub_date: new Date('2026-01-01T00:00:00.000Z'),
        item_flag_status: {
          id: input.archived ? ItemFlagStatusStatusEnum.Archived : ItemFlagStatusStatusEnum.Active,
        },
      })
    );
    return { id: item.id, idText: item.id_text };
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
    legacyKind: 'podcast' | 'episode';
    legacyId: string;
    v5Kind: 'channel' | 'item';
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
        legacy_kind: input.legacyKind,
        legacy_id: input.legacyId,
        v5_kind: input.v5Kind,
        v5_id_text: input.v5IdText,
        resolve_key: input.resolveKey,
        v4_feed_url: input.v4FeedUrl,
        status: input.status,
      })
    );
  }

  async function lookup(
    episodes: DTOLegacyEpisodeLookupRef[]
  ): Promise<DTOLegacyEpisodeLookupAnswer[]> {
    const response = await request(requireApp())
      .post(`${base}/legacy/episode/lookup`)
      .send({ episodes });
    expect(response.status).toBe(200);
    return readAnswers(response.body);
  }

  beforeAll(async () => {
    const started = await startTestApp();
    server = started.server;
    ormContext = started.ormContext;
    app = started.app;
    if (!ormContext) {
      throw new Error('ORM context required for legacy episode lookup');
    }
    base = await getBaseApiUrl();
  }, 120000);

  afterAll(async () => {
    if (ormContext) {
      const db = ormContext.dataSourceReadWrite;
      if (seededMergeIds.length > 0) {
        await db.query(`DELETE FROM item_merge_map WHERE channel_merge_id = ANY($1::int[])`, [
          seededMergeIds,
        ]);
        await db.query(`DELETE FROM channel_merge WHERE id = ANY($1::int[])`, [seededMergeIds]);
      }
      if (seededLegacyIds.length > 0) {
        await db.query(
          `DELETE FROM legacy_id_map
           WHERE legacy_id = ANY($1::text[])
             AND legacy_kind IN ('podcast', 'episode')`,
          [seededLegacyIds]
        );
      }
      if (seededFeedIds.length > 0) {
        await db.query(`DELETE FROM feed WHERE id = ANY($1::int[])`, [seededFeedIds]);
      }
    }
    await stopTestApp(server, ormContext);
  });

  it('answers each kind in input order', async () => {
    const imaged = await seedChannel({
      feedUrl: httpsFeedUrl(),
      title: 'Mapped episode show',
      withAbout: true,
      publicVisible: true,
      imageUrl: 'https://cdn.example.com/legacy-episode-mapped.jpg',
    });
    const listed = await seedChannel({
      feedUrl: httpsFeedUrl(),
      title: 'Listed episode show',
      withAbout: true,
      publicVisible: true,
      imageUrl: null,
    });
    const mappedItem = await seedItem({
      channelId: imaged.channelId,
      guid: itemGuid('mapped'),
      enclosureUrl: mediaUrl('mapped'),
    });
    const guidItem = await seedItem({
      channelId: listed.channelId,
      guid: itemGuid('listed-guid'),
      enclosureUrl: mediaUrl('listed-guid-other'),
    });
    const urlItem = await seedItem({
      channelId: listed.channelId,
      guid: itemGuid('listed-url-other'),
      enclosureUrl: mediaUrl('listed-url'),
    });
    const mappedPodcastId = legacyId('pa');
    const listedPodcastId = legacyId('pb');
    const feedPodcastId = legacyId('pc');
    const blockedPodcastId = legacyId('pd');
    const missingPodcastId = legacyId('pe');
    const mappedEpisodeId = legacyId('ea');
    const guidEpisodeId = legacyId('eb');
    const urlEpisodeId = legacyId('ec');
    const missEpisodeId = legacyId('ed');
    const feedEpisodeId = legacyId('ee');
    const blockedEpisodeId = legacyId('ef');
    const missingEpisodeId = legacyId('eg');
    const feedOnlyUrl = `https://legacy-episode-missing-${runKey}.example.com/feed.xml`;
    await insertMapRow({
      legacyKind: 'podcast',
      legacyId: mappedPodcastId,
      v5Kind: 'channel',
      status: 'mapped',
      v5IdText: imaged.channelIdText,
      resolveKey: null,
      v4FeedUrl: imaged.feedUrl,
    });
    await insertMapRow({
      legacyKind: 'episode',
      legacyId: mappedEpisodeId,
      v5Kind: 'item',
      status: 'mapped',
      v5IdText: mappedItem.idText,
      resolveKey: null,
      v4FeedUrl: null,
    });
    await insertMapRow({
      legacyKind: 'podcast',
      legacyId: listedPodcastId,
      v5Kind: 'channel',
      status: 'mapped',
      v5IdText: listed.channelIdText,
      resolveKey: null,
      v4FeedUrl: null,
    });
    await insertMapRow({
      legacyKind: 'podcast',
      legacyId: feedPodcastId,
      v5Kind: 'channel',
      status: 'unresolved',
      v5IdText: null,
      resolveKey: null,
      v4FeedUrl: feedOnlyUrl,
    });
    await insertMapRow({
      legacyKind: 'podcast',
      legacyId: blockedPodcastId,
      v5Kind: 'channel',
      status: 'dropped',
      v5IdText: imaged.channelIdText,
      resolveKey: null,
      v4FeedUrl: imaged.feedUrl,
    });
    await insertMapRow({
      legacyKind: 'episode',
      legacyId: blockedEpisodeId,
      v5Kind: 'item',
      status: 'mapped',
      v5IdText: mappedItem.idText,
      resolveKey: null,
      v4FeedUrl: null,
    });

    const answers = await lookup([
      episodeRef(mappedEpisodeId, mappedPodcastId, null, null),
      episodeRef(guidEpisodeId, listedPodcastId, itemGuid('listed-guid'), null),
      episodeRef(urlEpisodeId, listedPodcastId, null, mediaUrl('listed-url')),
      episodeRef(missEpisodeId, listedPodcastId, itemGuid('missing'), mediaUrl('missing')),
      episodeRef(feedEpisodeId, feedPodcastId, null, null),
      episodeRef(blockedEpisodeId, blockedPodcastId, itemGuid('mapped'), mediaUrl('mapped')),
      episodeRef(missingEpisodeId, missingPodcastId, null, null),
    ]);

    expect(answers).toEqual([
      {
        episode_id: mappedEpisodeId,
        kind: 'item',
        item_id_text: mappedItem.idText,
        channel: channelOf(imaged),
      },
      {
        episode_id: guidEpisodeId,
        kind: 'item',
        item_id_text: guidItem.idText,
        channel: channelOf(listed),
      },
      {
        episode_id: urlEpisodeId,
        kind: 'item',
        item_id_text: urlItem.idText,
        channel: channelOf(listed),
      },
      { episode_id: missEpisodeId, kind: 'channel', channel: channelOf(listed) },
      { episode_id: feedEpisodeId, kind: 'feed_url', feed_url: feedOnlyUrl },
      { episode_id: blockedEpisodeId, kind: 'blocked' },
      { episode_id: missingEpisodeId, kind: 'not_here' },
    ]);
  });

  it('uses the guid item when the media URL matches a different item', async () => {
    const channel = await seedChannel({
      feedUrl: httpsFeedUrl(),
      title: 'Guid wins show',
      withAbout: true,
      publicVisible: true,
      imageUrl: 'https://cdn.example.com/legacy-episode-guid.jpg',
    });
    const guidItem = await seedItem({
      channelId: channel.channelId,
      guid: itemGuid('wins-guid'),
      enclosureUrl: mediaUrl('wins-guid-other'),
    });
    await seedItem({
      channelId: channel.channelId,
      guid: itemGuid('wins-url-other'),
      enclosureUrl: mediaUrl('wins-url'),
    });
    const podcastId = legacyId('pf');
    const episodeId = legacyId('eh');
    await insertMapRow({
      legacyKind: 'podcast',
      legacyId: podcastId,
      v5Kind: 'channel',
      status: 'mapped',
      v5IdText: channel.channelIdText,
      resolveKey: null,
      v4FeedUrl: null,
    });

    const answers = await lookup([
      episodeRef(episodeId, podcastId, itemGuid('wins-guid'), mediaUrl('wins-url')),
    ]);

    expect(answers).toEqual([
      {
        episode_id: episodeId,
        kind: 'item',
        item_id_text: guidItem.idText,
        channel: channelOf(channel),
      },
    ]);
  });

  it('follows an episode row onto the survivor item and channel', async () => {
    const absorbed = await seedChannel({
      feedUrl: httpsFeedUrl(),
      title: 'Absorbed episode show',
      withAbout: true,
      publicVisible: true,
      imageUrl: 'https://cdn.example.com/legacy-episode-absorbed.jpg',
    });
    const survivor = await seedChannel({
      feedUrl: httpsFeedUrl(),
      title: 'Survivor episode show',
      withAbout: true,
      publicVisible: true,
      imageUrl: 'https://cdn.example.com/legacy-episode-survivor.jpg',
    });
    const fromItem = await seedItem({
      channelId: absorbed.channelId,
      guid: itemGuid('from'),
      enclosureUrl: mediaUrl('from'),
    });
    const toItem = await seedItem({
      channelId: survivor.channelId,
      guid: itemGuid('to'),
      enclosureUrl: mediaUrl('to'),
    });
    const {
      ChannelMerge,
      ChannelMergeMode,
      ChannelMergeStatus,
      FeedLifecycleStateKeyEnum,
      ItemMergeMap,
      ItemMergeMatchTier,
    } = await import('@podverse/orm');
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
    const mapRepo = manager.getRepository(ItemMergeMap);
    await mapRepo.save(
      mapRepo.create({
        channel_merge_id: merge.id,
        from_item_id: fromItem.id,
        to_item_id: toItem.id,
        match_tier: ItemMergeMatchTier.Guid,
      })
    );
    await setLifecycle(absorbed.feedId, FeedLifecycleStateKeyEnum.Merged);
    const podcastId = legacyId('pi');
    const episodeId = legacyId('ei');
    await insertMapRow({
      legacyKind: 'podcast',
      legacyId: podcastId,
      v5Kind: 'channel',
      status: 'mapped',
      v5IdText: absorbed.channelIdText,
      resolveKey: null,
      v4FeedUrl: null,
    });
    await insertMapRow({
      legacyKind: 'episode',
      legacyId: episodeId,
      v5Kind: 'item',
      status: 'mapped',
      v5IdText: fromItem.idText,
      resolveKey: null,
      v4FeedUrl: null,
    });

    const answers = await lookup([episodeRef(episodeId, podcastId, null, null)]);

    expect(answers).toEqual([
      {
        episode_id: episodeId,
        kind: 'item',
        item_id_text: toItem.idText,
        channel: channelOf(survivor),
      },
    ]);
  });

  it('matches the guid when the mapped episode item is archived', async () => {
    const channel = await seedChannel({
      feedUrl: httpsFeedUrl(),
      title: 'Archived episode show',
      withAbout: true,
      publicVisible: true,
      imageUrl: null,
    });
    const archived = await seedItem({
      channelId: channel.channelId,
      guid: itemGuid('archived'),
      enclosureUrl: mediaUrl('archived'),
      archived: true,
    });
    const active = await seedItem({
      channelId: channel.channelId,
      guid: itemGuid('active'),
      enclosureUrl: mediaUrl('active'),
    });
    const podcastId = legacyId('pj');
    const episodeId = legacyId('ej');
    await insertMapRow({
      legacyKind: 'podcast',
      legacyId: podcastId,
      v5Kind: 'channel',
      status: 'mapped',
      v5IdText: channel.channelIdText,
      resolveKey: null,
      v4FeedUrl: null,
    });
    await insertMapRow({
      legacyKind: 'episode',
      legacyId: episodeId,
      v5Kind: 'item',
      status: 'mapped',
      v5IdText: archived.idText,
      resolveKey: null,
      v4FeedUrl: null,
    });

    const answers = await lookup([episodeRef(episodeId, podcastId, itemGuid('active'), null)]);

    expect(answers).toEqual([
      {
        episode_id: episodeId,
        kind: 'item',
        item_id_text: active.idText,
        channel: channelOf(channel),
      },
    ]);
  });

  it('returns 400 when more than 200 episodes are sent', async () => {
    const episodes = Array.from({ length: LEGACY_EPISODE_LOOKUP_MAX_EPISODES + 1 }, (_, index) =>
      episodeRef(`e${index}`, 'p1', null, null)
    );
    const response = await request(requireApp())
      .post(`${base}/legacy/episode/lookup`)
      .send({ episodes });

    expect(response.status).toBe(400);
  });

  it('returns 400 when an episode omits podcast_id', async () => {
    const response = await request(requireApp())
      .post(`${base}/legacy/episode/lookup`)
      .send({
        episodes: [{ episode_id: 'ep-missing', guid: null, media_url: null }],
      });

    expect(response.status).toBe(400);
  });
});
