import { randomUUID } from 'node:crypto';

import type { Server } from 'http';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { MediumEnum } from '@podverse/helpers';
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
  podcastGuid: string | null;
  feedUrl: string;
  title: string;
};

type SeedChannelInput = {
  podcastGuid: string | null;
  feedUrl: string;
  title: string;
  withAbout: boolean;
  publicVisible: boolean;
};

let podcastIndexSlot = 0;

function nextPodcastIndexId(): number {
  podcastIndexSlot += 1;
  const hex = randomUUID().replaceAll('-', '').slice(0, 6);
  const parsed = Number.parseInt(hex, 16) % 200_000_000;
  return 1_700_000_000 + parsed + podcastIndexSlot;
}

function hostName(): string {
  return `dir-match-${randomUUID()}.example.com`;
}

describe('POST /channel/add-by-rss-match', () => {
  let app: import('express').Express | undefined;
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let channelBase = '';
  const seededFeedIds: number[] = [];

  function requireApp(): import('express').Express {
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

  async function seedChannel(input: SeedChannelInput): Promise<SeededChannel> {
    const manager = requireManager();
    const { Channel, Feed } = await import('@podverse/orm');
    const feedRepo = manager.getRepository(Feed);
    const feed = await feedRepo.save(
      feedRepo.create({
        url: input.feedUrl,
        podcast_index_id: nextPodcastIndexId(),
      })
    );
    seededFeedIds.push(feed.id);
    const channelRepo = manager.getRepository(Channel);
    const channel = await channelRepo.save(
      channelRepo.create({
        feed_id: feed.id,
        medium_id: MediumEnum.Podcast,
        title: input.title,
        podcast_guid: input.podcastGuid,
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
    return {
      feedId: feed.id,
      channelId: channel.id,
      channelIdText: channel.id_text,
      podcastGuid: input.podcastGuid,
      feedUrl: input.feedUrl,
      title: input.title,
    };
  }

  async function seedItem(input: {
    channelId: number;
    guid: string | null;
    enclosureUrl: string | null;
  }): Promise<string> {
    const { Item, ItemFlagStatusStatusEnum } = await import('@podverse/orm');
    const repo = requireManager().getRepository(Item);
    const item = await repo.save(
      repo.create({
        channel_id: String(input.channelId),
        guid: input.guid,
        guid_enclosure_url: input.enclosureUrl,
        title: 'Directory match item',
        pub_date: new Date('2026-01-01T00:00:00.000Z'),
        item_flag_status: { id: ItemFlagStatusStatusEnum.Active },
      })
    );
    return item.id_text;
  }

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    const apiBase = await getBaseApiUrl();
    channelBase = `${apiBase}/channel`;
  }, 120000);

  afterAll(async () => {
    if (ormContext && seededFeedIds.length > 0) {
      await ormContext.dataSourceReadWrite.query(`DELETE FROM feed WHERE id = ANY($1::int[])`, [
        seededFeedIds,
      ]);
    }
    await stopTestApp(server, ormContext);
  });

  it('matches an https input to a channel stored with http and a trailing slash', async () => {
    const host = hostName();
    const stored = `http://${host}/show/`;
    const podcastGuid = randomUUID();
    const channel = await seedChannel({
      podcastGuid,
      feedUrl: stored,
      title: 'Slash match show',
      withAbout: true,
      publicVisible: true,
    });
    const input = `https://${host.toUpperCase()}/show`;
    const missing = `https://missing-${randomUUID()}.example.com/nope`;

    const res = await request(requireApp())
      .post(`${channelBase}/add-by-rss-match`)
      .send({
        feeds: [
          { feed_url: input, feed_guid: podcastGuid.toUpperCase() },
          { feed_url: missing },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      matches: [
        {
          feed_url: input,
          channel: {
            id_text: channel.channelIdText,
            title: channel.title,
            medium_id: MediumEnum.Podcast,
          },
          items: [],
        },
        { feed_url: missing, channel: null, items: [] },
      ],
    });
  });

  it('does not match a different query string', async () => {
    const host = hostName();
    await seedChannel({
      podcastGuid: null,
      feedUrl: `http://${host}/feed.xml?a=1`,
      title: 'Query show',
      withAbout: true,
      publicVisible: true,
    });
    const input = `https://${host}/feed.xml?a=2`;

    const res = await request(requireApp())
      .post(`${channelBase}/add-by-rss-match`)
      .send({ feeds: [{ feed_url: input }] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      matches: [{ feed_url: input, channel: null, items: [] }],
    });
  });

  it('does not match when the feed guid differs', async () => {
    const host = hostName();
    const stored = `http://${host}/feed.xml`;
    await seedChannel({
      podcastGuid: randomUUID(),
      feedUrl: stored,
      title: 'Different guid show',
      withAbout: true,
      publicVisible: true,
    });
    const input = `https://${host}/feed.xml`;

    const res = await request(requireApp())
      .post(`${channelBase}/add-by-rss-match`)
      .send({ feeds: [{ feed_url: input, feed_guid: randomUUID() }] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      matches: [{ feed_url: input, channel: null, items: [] }],
    });
  });

  it('does not match a channel that is not publicly visible', async () => {
    const host = hostName();
    const stored = `https://${host}/feed.xml`;
    await seedChannel({
      podcastGuid: null,
      feedUrl: stored,
      title: 'Hidden show',
      withAbout: true,
      publicVisible: false,
    });

    const res = await request(requireApp())
      .post(`${channelBase}/add-by-rss-match`)
      .send({ feeds: [{ feed_url: stored }] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      matches: [{ feed_url: stored, channel: null, items: [] }],
    });
  });

  it('returns no channel when the URL has userinfo', async () => {
    const host = hostName();
    await seedChannel({
      podcastGuid: null,
      feedUrl: `https://${host}/feed.xml`,
      title: 'Userinfo show',
      withAbout: true,
      publicVisible: true,
    });
    const input = `https://alice:pw@${host}/feed.xml`;

    const res = await request(requireApp())
      .post(`${channelBase}/add-by-rss-match`)
      .send({ feeds: [{ feed_url: input }] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      matches: [{ feed_url: input, channel: null, items: [] }],
    });
  });

  it('maps items by guid, then enclosure URL, and keeps request order', async () => {
    const host = hostName();
    const stored = `https://${host}/feed.xml`;
    const channel = await seedChannel({
      podcastGuid: null,
      feedUrl: stored,
      title: 'Item match show',
      withAbout: true,
      publicVisible: true,
    });
    const guid = `guid-${randomUUID()}`;
    const unusedEnclosure = `https://${host}/unused.mp3`;
    const enclosureUrl = `https://${host}/episode.mp3`;
    const enclosureMissGuid = `missing-${randomUUID()}`;
    const absentGuid = `missing-${randomUUID()}`;
    const absentEnclosure = `https://${host}/absent.mp3`;
    const guidItemIdText = await seedItem({
      channelId: channel.channelId,
      guid,
      enclosureUrl: `https://${host}/other.mp3`,
    });
    const enclosureItemIdText = await seedItem({
      channelId: channel.channelId,
      guid: `other-${randomUUID()}`,
      enclosureUrl,
    });

    const res = await request(requireApp())
      .post(`${channelBase}/add-by-rss-match`)
      .send({
        feeds: [
          {
            feed_url: stored,
            items: [
              { guid, enclosure_url: unusedEnclosure },
              { guid: enclosureMissGuid, enclosure_url: enclosureUrl },
              { guid: absentGuid, enclosure_url: absentEnclosure },
            ],
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      matches: [
        {
          feed_url: stored,
          channel: {
            id_text: channel.channelIdText,
            title: channel.title,
            medium_id: MediumEnum.Podcast,
          },
          items: [
            { guid, enclosure_url: unusedEnclosure, item_id_text: guidItemIdText },
            {
              guid: enclosureMissGuid,
              enclosure_url: enclosureUrl,
              item_id_text: enclosureItemIdText,
            },
            { guid: absentGuid, enclosure_url: absentEnclosure, item_id_text: null },
          ],
        },
      ],
    });
  });

  it('returns 400 when the feed or item cap is exceeded', async () => {
    const tooManyFeeds = Array.from({ length: 101 }, () => ({
      feed_url: 'https://example.com/feed.xml',
    }));
    const feedsRes = await request(requireApp())
      .post(`${channelBase}/add-by-rss-match`)
      .send({ feeds: tooManyFeeds });
    expect(feedsRes.status).toBe(400);

    const tooManyItems = Array.from({ length: 501 }, () => ({
      guid: null,
      enclosure_url: null,
    }));
    const itemsRes = await request(requireApp())
      .post(`${channelBase}/add-by-rss-match`)
      .send({ feeds: [{ feed_url: 'https://example.com/feed.xml', items: tooManyItems }] });
    expect(itemsRes.status).toBe(400);
  });
});
