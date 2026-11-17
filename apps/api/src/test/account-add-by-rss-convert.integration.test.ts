import { randomUUID } from 'node:crypto';

import { config } from '@api/config/index.js';
import type { Server } from 'http';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  AccountMembershipEnum,
  formatGuidEnclosureUrl,
  getAddByRSSHashId,
  MediumEnum,
  SharableStatusEnum,
} from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  withMutedExpectedErrorLogs,
} from './helpers/index.js';

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
  feedUrl: string;
  title: string;
};

type SeededItem = { id: number; idText: string };

type AccountFixture = { id: number; idText: string };

const SEEN_AT = '2026-06-01T15:04:05.000Z';

let podcastIndexSlot = 0;

function nextPodcastIndexId(): number {
  podcastIndexSlot += 1;
  const hex = randomUUID().replaceAll('-', '').slice(0, 6);
  const parsed = Number.parseInt(hex, 16) % 200_000_000;
  return 1_810_000_000 + parsed + podcastIndexSlot;
}

function hostName(): string {
  return `dir-convert-${randomUUID()}.example.com`;
}

function playlistIdText(): string {
  return `pl${randomUUID().replaceAll('-', '').slice(0, 10)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordsFrom(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

function requiredInt(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  throw new Error(`Expected integer ${key}`);
}

function countOf(value: unknown): number {
  const row = recordsFrom(value)[0];
  if (row === undefined) {
    return 0;
  }
  const count = row['n'];
  if (typeof count === 'number') {
    return count;
  }
  if (typeof count === 'string') {
    return Number(count);
  }
  return 0;
}

function timeMs(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'string') {
    return Date.parse(value);
  }
  throw new Error('Expected a timestamp');
}

function episodeData(feedUrl: string, guid: string | null, enclosureUrl: string | null) {
  return {
    feed_url: feedUrl,
    guid,
    enclosure_url: enclosureUrl,
    channel_id_text: 'devicechan1',
  };
}

describe('Add by RSS directory conversion', () => {
  let app: import('express').Express | undefined;
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let accountBase = '';
  const seededFeedIds: number[] = [];
  const seededPlaylistIds: number[] = [];

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

  async function createAccount(): Promise<AccountFixture> {
    const { AccountService } = await import('@podverse/orm');
    const email = `dir-convert-${randomUUID()}@example.com`;
    const accountService = new AccountService();
    await accountService.create({
      email,
      password: 'IntegrationTest1!',
      locale: 'en-US',
      terms_version: '2026-10-15',
    });
    const account = await accountService.getByEmail(email);
    if (!account) {
      throw new Error('expected the seeded account');
    }
    return { id: account.id, idText: account.id_text };
  }

  async function grantPremium(accountId: number): Promise<void> {
    await requireManager().query(
      `UPDATE account_membership_status
       SET account_membership_id = $2,
           membership_expires_at = now() + interval '30 days'
       WHERE account_id = $1`,
      [accountId, AccountMembershipEnum.Premium]
    );
    await requireManager().query(
      `INSERT INTO billing_membership_grant (account_id, source, starts_at, ends_at)
       VALUES ($1, 'admin', now(), now() + interval '30 days')`,
      [accountId]
    );
  }

  async function lapseMembership(accountId: number): Promise<void> {
    await requireManager().query(
      `UPDATE billing_membership_grant
       SET revoked_at = now()
       WHERE account_id = $1 AND revoked_at IS NULL`,
      [accountId]
    );
    await requireManager().query(
      `UPDATE account_membership_status
       SET membership_expires_at = now() - interval '1 day'
       WHERE account_id = $1`,
      [accountId]
    );
  }

  async function seedChannel(input: {
    feedUrl: string;
    title: string;
    podcastGuid: string | null;
  }): Promise<SeededChannel> {
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
       VALUES ($1, true, true, true)`,
      [feed.id]
    );
    await manager.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [channel.id]);
    return {
      feedId: feed.id,
      channelId: channel.id,
      channelIdText: channel.id_text,
      feedUrl: input.feedUrl,
      title: input.title,
    };
  }

  async function seedItem(input: {
    channelId: number;
    guid: string;
    enclosureUrl: string;
  }): Promise<SeededItem> {
    const { Item, ItemFlagStatusStatusEnum } = await import('@podverse/orm');
    const repo = requireManager().getRepository(Item);
    const item = await repo.save(
      repo.create({
        channel_id: String(input.channelId),
        guid: input.guid,
        guid_enclosure_url: formatGuidEnclosureUrl(input.enclosureUrl),
        title: 'Directory convert item',
        pub_date: new Date('2026-01-01T00:00:00.000Z'),
        item_flag_status: { id: ItemFlagStatusStatusEnum.Active },
      })
    );
    return { id: item.id, idText: item.id_text };
  }

  async function insertFollow(input: {
    accountId: number;
    feedUrl: string;
    requiresCredentials: boolean;
    lastSeenAt: string | null;
  }): Promise<void> {
    await requireManager().query(
      `INSERT INTO account_following_add_by_rss_channel
         (account_id, feed_url, title, requires_credentials, last_seen_at)
       VALUES ($1, $2, 'Saved show', $3, $4)`,
      [input.accountId, input.feedUrl, input.requiresCredentials, input.lastSeenAt]
    );
  }

  async function addByRssFollowCount(accountId: number, feedUrl: string): Promise<number> {
    return countOf(
      await requireManager().query(
        `SELECT count(*)::int AS n
         FROM account_following_add_by_rss_channel
         WHERE account_id = $1 AND feed_url = $2`,
        [accountId, feedUrl]
      )
    );
  }

  async function directoryFollowSeenAt(accountId: number, channelId: number): Promise<unknown> {
    const rows = recordsFrom(
      await requireManager().query(
        `SELECT last_seen_at
         FROM account_following_channel
         WHERE account_id = $1 AND channel_id = $2`,
        [accountId, channelId]
      )
    );
    return rows[0]?.['last_seen_at'];
  }

  async function avQueueId(accountId: number): Promise<number> {
    const { QueueService } = await import('@podverse/orm');
    const queues = await new QueueService().getAllPrivate(accountId);
    const queue = queues.find((row) => row.medium_id === MediumEnum.AV);
    if (queue === undefined) {
      throw new Error('av queue missing');
    }
    return queue.id;
  }

  async function insertQueueRow(input: {
    queueId: number;
    listPosition: string;
    playbackPosition: string;
    resource: ReturnType<typeof episodeData>;
  }): Promise<{ id: number; hashId: string }> {
    const hashId = getAddByRSSHashId(input.resource);
    const rows = recordsFrom(
      await requireManager().query(
        `INSERT INTO queue_resource (
           queue_id, list_position, playback_position, add_by_rss_hash_id, add_by_rss_resource_data
         )
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING id`,
        [
          input.queueId,
          input.listPosition,
          input.playbackPosition,
          hashId,
          JSON.stringify(input.resource),
        ]
      )
    );
    const row = rows[0];
    if (row === undefined) {
      throw new Error('queue row was not inserted');
    }
    return { id: requiredInt(row, 'id'), hashId };
  }

  async function insertPlaylist(accountId: number, title: string): Promise<number> {
    const rows = recordsFrom(
      await requireManager().query(
        `INSERT INTO playlist (id_text, account_id, sharable_status_id, title, medium_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [playlistIdText(), accountId, SharableStatusEnum.Private, title, MediumEnum.Podcast]
      )
    );
    const row = rows[0];
    if (row === undefined) {
      throw new Error('playlist was not inserted');
    }
    const id = requiredInt(row, 'id');
    seededPlaylistIds.push(id);
    return id;
  }

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    accountBase = `${await getBaseApiUrl()}/account`;
  }, 120000);

  afterAll(async () => {
    if (ormContext && seededPlaylistIds.length > 0) {
      await ormContext.dataSourceReadWrite.query(`DELETE FROM playlist WHERE id = ANY($1::int[])`, [
        seededPlaylistIds,
      ]);
    }
    if (ormContext && seededFeedIds.length > 0) {
      await ormContext.dataSourceReadWrite.query(`DELETE FROM feed WHERE id = ANY($1::int[])`, [
        seededFeedIds,
      ]);
    }
    await stopTestApp(server, ormContext);
  });

  it('follows a matching URL as a directory channel and does not use the Add by RSS cap', async () => {
    const host = hostName();
    const feedUrl = `https://${host}/feed.xml`;
    const channel = await seedChannel({
      feedUrl,
      title: 'Already in the directory',
      podcastGuid: randomUUID(),
    });
    const account = await createAccount();
    await grantPremium(account.id);
    await requireManager().query(
      `UPDATE account_membership_status SET max_add_by_rss_feeds = 0 WHERE account_id = $1`,
      [account.id]
    );
    const previousFixtures = config.e2e.fixturesEnabled;
    config.e2e.fixturesEnabled = false;
    try {
      const matched = await request(requireApp())
        .post(`${accountBase}/follow/add-by-rss-channel`)
        .set(authHeaders(account.id, account.idText))
        .send({ feed_url: feedUrl });

      expect(matched.status).toBe(200);
      expect(matched.body).toEqual({
        message: 'Followed directory channel',
        directory_channel: {
          id_text: channel.channelIdText,
          title: channel.title,
          medium_id: MediumEnum.Podcast,
        },
      });
      expect(await addByRssFollowCount(account.id, feedUrl)).toBe(0);
      expect(await directoryFollowSeenAt(account.id, channel.channelId)).toBeNull();

      const missingUrl = `https://missing-${randomUUID()}.example.com/feed.xml`;
      const blocked = await withMutedExpectedErrorLogs(() =>
        request(requireApp())
          .post(`${accountBase}/follow/add-by-rss-channel`)
          .set(authHeaders(account.id, account.idText))
          .send({ feed_url: missingUrl })
      );
      expect(blocked.status).toBe(403);
      expect(blocked.body).toEqual(
        expect.objectContaining({ code: 'add_by_rss_feed_limit_reached' })
      );
      expect(await addByRssFollowCount(account.id, missingUrl)).toBe(0);
    } finally {
      config.e2e.fixturesEnabled = previousFixtures;
    }
  });

  it('saves a non-matching URL as Add by RSS with a null directory channel', async () => {
    const feedUrl = `https://${hostName()}/feed.xml`;
    const account = await createAccount();
    await grantPremium(account.id);

    const res = await request(requireApp())
      .post(`${accountBase}/follow/add-by-rss-channel`)
      .set(authHeaders(account.id, account.idText))
      .send({ feed_url: feedUrl, title: 'Private feed' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      message: 'RSS channel added/updated successfully',
      directory_channel: null,
    });
    expect(await addByRssFollowCount(account.id, feedUrl)).toBe(1);
  });

  it('keeps a credentialed matching URL as Add by RSS', async () => {
    const feedUrl = `https://${hostName()}/feed.xml`;
    const channel = await seedChannel({
      feedUrl,
      title: 'Password show',
      podcastGuid: null,
    });
    const account = await createAccount();
    await grantPremium(account.id);

    const res = await request(requireApp())
      .post(`${accountBase}/follow/add-by-rss-channel`)
      .set(authHeaders(account.id, account.idText))
      .send({ feed_url: feedUrl, requires_credentials: true });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      message: 'RSS channel added/updated successfully',
      directory_channel: null,
    });
    expect(await addByRssFollowCount(account.id, feedUrl)).toBe(1);
    expect(await directoryFollowSeenAt(account.id, channel.channelId)).toBeUndefined();
  });

  it('converts an existing Add by RSS follow when the follow route sees a directory match', async () => {
    const feedUrl = `https://${hostName()}/feed.xml`;
    const channel = await seedChannel({
      feedUrl,
      title: 'Refresh on add',
      podcastGuid: null,
    });
    const account = await createAccount();
    await grantPremium(account.id);
    await insertFollow({
      accountId: account.id,
      feedUrl,
      requiresCredentials: false,
      lastSeenAt: SEEN_AT,
    });

    const res = await request(requireApp())
      .post(`${accountBase}/follow/add-by-rss-channel`)
      .set(authHeaders(account.id, account.idText))
      .send({ feed_url: feedUrl });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Followed directory channel',
      directory_channel: {
        id_text: channel.channelIdText,
        title: channel.title,
        medium_id: MediumEnum.Podcast,
      },
    });
    expect(await addByRssFollowCount(account.id, feedUrl)).toBe(0);
    expect(timeMs(await directoryFollowSeenAt(account.id, channel.channelId))).toBe(
      Date.parse(SEEN_AT)
    );
  });

  it('moves queue rows by guid then enclosure and drops an owned playlist duplicate', async () => {
    const host = hostName();
    const feedUrl = `https://${host}/feed.xml`;
    const channel = await seedChannel({
      feedUrl,
      title: 'Convert show',
      podcastGuid: randomUUID(),
    });
    const itemA = await seedItem({
      channelId: channel.channelId,
      guid: 'episode-a',
      enclosureUrl: `https://${host}/a.mp3`,
    });
    const itemB = await seedItem({
      channelId: channel.channelId,
      guid: 'episode-b',
      enclosureUrl: `https://${host}/b.mp3`,
    });
    const account = await createAccount();
    const other = await createAccount();
    await insertFollow({
      accountId: account.id,
      feedUrl,
      requiresCredentials: false,
      lastSeenAt: SEEN_AT,
    });

    const queueId = await avQueueId(account.id);
    const upcoming = await insertQueueRow({
      queueId,
      listPosition: '1',
      playbackPosition: '5',
      resource: episodeData(feedUrl, 'episode-a', `https://${host}/a.mp3`),
    });
    const history = await insertQueueRow({
      queueId,
      listPosition: '-1',
      playbackPosition: '40',
      resource: episodeData(feedUrl, 'not-in-the-directory', `https://${host}/b.mp3`),
    });
    const unmatched = await insertQueueRow({
      queueId,
      listPosition: '2',
      playbackPosition: '1',
      resource: episodeData(feedUrl, 'missing-guid', `https://${host}/missing.mp3`),
    });

    const playlistId = await insertPlaylist(account.id, 'Owned playlist');
    await requireManager().query(
      `INSERT INTO playlist_resource (playlist_id, list_position, item_id) VALUES ($1, '1', $2)`,
      [playlistId, itemA.id]
    );
    const playlistEpisode = episodeData(feedUrl, 'episode-a', `https://${host}/a.mp3`);
    const playlistHash = getAddByRSSHashId(playlistEpisode);
    await requireManager().query(
      `INSERT INTO playlist_resource
         (playlist_id, list_position, add_by_rss_hash_id, add_by_rss_resource_data)
       VALUES ($1, '2', $2, $3::jsonb)`,
      [playlistId, playlistHash, JSON.stringify(playlistEpisode)]
    );

    const otherPlaylistId = await insertPlaylist(other.id, 'Someone else');
    const otherRows = recordsFrom(
      await requireManager().query(
        `INSERT INTO playlist_resource
           (playlist_id, list_position, add_by_rss_hash_id, add_by_rss_resource_data)
         VALUES ($1, '1', $2, $3::jsonb)
         RETURNING id`,
        [otherPlaylistId, playlistHash, JSON.stringify(playlistEpisode)]
      )
    );
    const otherRow = otherRows[0];
    if (otherRow === undefined) {
      throw new Error('other playlist row was not inserted');
    }
    const otherRowId = requiredInt(otherRow, 'id');

    const contentLogsBefore = countOf(
      await requireManager().query(
        `SELECT count(*)::int AS n FROM account_content_log WHERE account_id = $1`,
        [account.id]
      )
    );

    const res = await request(requireApp())
      .post(`${accountBase}/add-by-rss/convert-to-channel`)
      .set(authHeaders(account.id, account.idText))
      .send({ feed_url: feedUrl });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      converted: true,
      channel: {
        id_text: channel.channelIdText,
        title: channel.title,
        medium_id: MediumEnum.Podcast,
      },
      items: [
        { add_by_rss_hash_id: upcoming.hashId, item_id_text: itemA.idText },
        { add_by_rss_hash_id: history.hashId, item_id_text: itemB.idText },
        { add_by_rss_hash_id: playlistHash, item_id_text: itemA.idText },
      ],
      queue_rows_moved: 2,
      queue_rows_dropped: 0,
      playlist_rows_moved: 0,
      playlist_rows_dropped: 1,
    });

    const queueRows = recordsFrom(
      await requireManager().query(
        `SELECT id, item_id, add_by_rss_hash_id,
                list_position::text AS list_position,
                playback_position::text AS playback_position
         FROM queue_resource
         WHERE id = ANY($1::int[])
         ORDER BY id`,
        [[upcoming.id, history.id, unmatched.id]]
      )
    );
    expect(queueRows).toEqual([
      expect.objectContaining({
        id: upcoming.id,
        item_id: itemA.id,
        add_by_rss_hash_id: null,
      }),
      expect.objectContaining({
        id: history.id,
        item_id: itemB.id,
        add_by_rss_hash_id: null,
      }),
      expect.objectContaining({
        id: unmatched.id,
        item_id: null,
        add_by_rss_hash_id: unmatched.hashId,
      }),
    ]);
    const historyRow = queueRows[1];
    const upcomingRow = queueRows[0];
    if (historyRow === undefined || upcomingRow === undefined) {
      throw new Error('queue rows missing');
    }
    expect(Number(historyRow['list_position'])).toBeLessThan(0);
    expect(Number(historyRow['playback_position'])).toBe(40);
    expect(Number(upcomingRow['playback_position'])).toBe(5);

    const ownedPlaylistRows = countOf(
      await requireManager().query(
        `SELECT count(*)::int AS n FROM playlist_resource WHERE playlist_id = $1`,
        [playlistId]
      )
    );
    expect(ownedPlaylistRows).toBe(1);

    const otherStill = recordsFrom(
      await requireManager().query(
        `SELECT item_id, add_by_rss_hash_id FROM playlist_resource WHERE id = $1`,
        [otherRowId]
      )
    );
    expect(otherStill).toEqual([{ item_id: null, add_by_rss_hash_id: playlistHash }]);

    expect(await addByRssFollowCount(account.id, feedUrl)).toBe(0);
    expect(timeMs(await directoryFollowSeenAt(account.id, channel.channelId))).toBe(
      Date.parse(SEEN_AT)
    );
    expect(
      countOf(
        await requireManager().query(
          `SELECT count(*)::int AS n FROM account_content_log WHERE account_id = $1`,
          [account.id]
        )
      )
    ).toBe(contentLogsBefore);
  });

  it('returns not_followed with the directory channel when the follow is already gone', async () => {
    const feedUrl = `https://${hostName()}/feed.xml`;
    const channel = await seedChannel({
      feedUrl,
      title: 'Gone follow',
      podcastGuid: null,
    });
    const account = await createAccount();

    const res = await request(requireApp())
      .post(`${accountBase}/add-by-rss/convert-to-channel`)
      .set(authHeaders(account.id, account.idText))
      .send({ feed_url: feedUrl });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      converted: false,
      reason: 'not_followed',
      channel: {
        id_text: channel.channelIdText,
        title: channel.title,
        medium_id: MediumEnum.Podcast,
      },
    });
    expect(await directoryFollowSeenAt(account.id, channel.channelId)).toBeUndefined();
  });

  it('converts an expired account', async () => {
    const feedUrl = `https://${hostName()}/feed.xml`;
    const channel = await seedChannel({
      feedUrl,
      title: 'Expired account show',
      podcastGuid: null,
    });
    const account = await createAccount();
    await lapseMembership(account.id);
    await insertFollow({
      accountId: account.id,
      feedUrl,
      requiresCredentials: false,
      lastSeenAt: null,
    });

    const res = await request(requireApp())
      .post(`${accountBase}/add-by-rss/convert-to-channel`)
      .set(authHeaders(account.id, account.idText))
      .send({ feed_url: feedUrl });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        converted: true,
        channel: {
          id_text: channel.channelIdText,
          title: channel.title,
          medium_id: MediumEnum.Podcast,
        },
      })
    );
    expect(await addByRssFollowCount(account.id, feedUrl)).toBe(0);
  });

  it('refuses a credentialed follow and a different feed guid', async () => {
    const feedUrl = `https://${hostName()}/feed.xml`;
    const podcastGuid = randomUUID();
    const channel = await seedChannel({
      feedUrl,
      title: 'Guarded show',
      podcastGuid,
    });
    const credentialed = await createAccount();
    await insertFollow({
      accountId: credentialed.id,
      feedUrl,
      requiresCredentials: true,
      lastSeenAt: null,
    });

    const credentialedRes = await request(requireApp())
      .post(`${accountBase}/add-by-rss/convert-to-channel`)
      .set(authHeaders(credentialed.id, credentialed.idText))
      .send({ feed_url: feedUrl });

    expect(credentialedRes.status).toBe(200);
    expect(credentialedRes.body).toEqual({
      converted: false,
      reason: 'requires_credentials',
      channel: null,
    });
    expect(await addByRssFollowCount(credentialed.id, feedUrl)).toBe(1);
    expect(await directoryFollowSeenAt(credentialed.id, channel.channelId)).toBeUndefined();

    const mismatched = await createAccount();
    await insertFollow({
      accountId: mismatched.id,
      feedUrl,
      requiresCredentials: false,
      lastSeenAt: null,
    });
    const mismatchedRes = await request(requireApp())
      .post(`${accountBase}/add-by-rss/convert-to-channel`)
      .set(authHeaders(mismatched.id, mismatched.idText))
      .send({ feed_url: feedUrl, feed_guid: randomUUID() });

    expect(mismatchedRes.status).toBe(200);
    expect(mismatchedRes.body).toEqual({
      converted: false,
      reason: 'no_match',
      channel: null,
    });
    expect(await addByRssFollowCount(mismatched.id, feedUrl)).toBe(1);
  });
});
