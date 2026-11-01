import { config } from '@api/config/index.js';
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { MediumEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import { authHeaders, getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

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

type EntityManager = ORMContext['dataSourceReadWrite']['manager'];

type SeededAccount = { id: number; idText: string };

type SeededChannel = {
  id: number;
  idText: string;
  title: string;
  imageUrl: string;
};

type TasteCounts = {
  listen_count: number;
  completion_count: number;
  recent_score: number;
  long_term_score: number;
};

type DailyCounts = { listener_count: number; completion_count: number };

const DAILY_LISTENER_COUNT = 7;
const DAILY_COMPLETION_COUNT = 2;
const HIDDEN_AT = '2026-04-04T15:00:00.000Z';
const UNKNOWN_CHANNEL_ID_TEXT = 'zzmissing01';

const TASTE = {
  c1: {
    listen: 3,
    completion: 1,
    recent: 1.5,
    longTerm: 2.5,
    first: '2026-03-01T00:00:00.000Z',
    last: '2026-03-03T00:00:00.000Z',
  },
  c2: {
    listen: 5,
    completion: 4,
    recent: 4.5,
    longTerm: 9.25,
    first: '2026-02-01T00:00:00.000Z',
    last: '2026-02-02T00:00:00.000Z',
  },
  c3: {
    listen: 1,
    completion: 0,
    recent: 0.5,
    longTerm: 0.5,
    first: '2026-01-01T00:00:00.000Z',
    last: '2026-01-01T12:00:00.000Z',
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstRow(value: unknown): Record<string, unknown> {
  const row = Array.isArray(value) ? value.filter(isRecord)[0] : undefined;
  if (row === undefined) {
    throw new Error('expected a row');
  }
  return row;
}

function asText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  throw new Error('expected a text value');
}

function asFiniteNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  throw new Error('expected a number');
}

function responseData(body: unknown): Record<string, unknown> {
  if (!isRecord(body) || !isRecord(body.data)) {
    throw new Error('expected response data');
  }
  return body.data;
}

function listItems(body: unknown): Record<string, unknown>[] {
  const items = responseData(body).items;
  if (!Array.isArray(items)) {
    throw new Error('expected items');
  }
  return items.filter(isRecord);
}

function channelIdText(row: Record<string, unknown>): string {
  if (!isRecord(row.channel) || typeof row.channel.id_text !== 'string') {
    throw new Error('expected channel.id_text');
  }
  return row.channel.id_text;
}

describe('Account Taste Profile routes (real database)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let manager: EntityManager;
  let accountBase: string;
  const runId = Date.now();
  const createdAccountIds: number[] = [];
  const createdFeedIds: number[] = [];

  let owner: SeededAccount;
  let emptyAccount: SeededAccount;
  let expiredAccount: SeededAccount;
  let ownerListenerId: string;
  let channels: Record<'c1' | 'c2' | 'c3' | 'c4' | 'c5', SeededChannel>;

  const query = async (sql: string, params: unknown[] = []): Promise<unknown> =>
    manager.query(sql, params);

  const seedAccount = async (label: string): Promise<SeededAccount> => {
    const { AccountService } = await import('@podverse/orm');
    const accountService = new AccountService();
    const email = `taste-profile-${label}-${runId}@example.com`;
    await accountService.create({
      email,
      password: 'IntegrationTest1!',
      locale: 'en-US',
      terms_version: config.terms.version,
    });
    const account = await accountService.getByEmail(email);
    if (!account) {
      throw new Error(`Failed to load account ${label}`);
    }
    createdAccountIds.push(account.id);
    return { id: account.id, idText: account.id_text };
  };

  const seedChannel = async (
    label: string,
    index: number,
    mediumId: number = MediumEnum.Podcast
  ): Promise<SeededChannel> => {
    const { Channel, Feed } = await import('@podverse/orm');
    const feedRepo = manager.getRepository(Feed);
    const feed = await feedRepo.save(
      feedRepo.create({
        url: `https://taste-profile-${runId}-${label}.example.com/feed.xml`,
        podcast_index_id: 1_700_000_000 + (runId % 40_000_000) + index,
      })
    );
    createdFeedIds.push(feed.id);
    const title = `Taste ${label} ${runId}`;
    const channelRepo = manager.getRepository(Channel);
    const channel = await channelRepo.save(
      channelRepo.create({
        feed_id: feed.id,
        medium_id: mediumId,
        title,
      })
    );
    const imageUrl = `https://taste-profile-${runId}.example.com/${label}.jpg`;
    await query(
      `INSERT INTO channel_image (channel_id, url, image_width_size, is_resized)
       VALUES ($1, $2, 600, false)`,
      [channel.id, imageUrl]
    );
    return { id: channel.id, idText: channel.id_text, title, imageUrl };
  };

  const seedListener = async (accountId: number): Promise<string> =>
    asText(
      firstRow(
        await query(
          `INSERT INTO listener_identity.stats_listener (account_id)
           VALUES ($1)
           RETURNING listener_id::text AS listener_id`,
          [accountId]
        )
      ).listener_id
    );

  const insertTaste = async (
    listenerId: string,
    channelId: number,
    counts: {
      listen: number;
      completion: number;
      recent: number;
      longTerm: number;
      first: string;
      last: string;
    }
  ): Promise<void> => {
    await query(
      `INSERT INTO stats_taste_profile
         (listener_id, channel_id, listen_count, completion_count, first_listened_at,
          last_listened_at, recent_score, long_term_score, scores_updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $6)`,
      [
        listenerId,
        channelId,
        counts.listen,
        counts.completion,
        counts.first,
        counts.last,
        counts.recent,
        counts.longTerm,
      ]
    );
  };

  const tasteCounts = async (accountId: number, channelId: number): Promise<TasteCounts | null> => {
    const result = await query(
      `SELECT listen_count, completion_count, recent_score, long_term_score
         FROM stats_taste_profile t
         JOIN listener_identity.stats_listener l ON l.listener_id = t.listener_id
        WHERE l.account_id = $1 AND t.channel_id = $2`,
      [accountId, channelId]
    );
    const row = Array.isArray(result) ? result.filter(isRecord)[0] : undefined;
    if (row === undefined) {
      return null;
    }
    return {
      listen_count: asFiniteNumber(row.listen_count),
      completion_count: asFiniteNumber(row.completion_count),
      recent_score: asFiniteNumber(row.recent_score),
      long_term_score: asFiniteNumber(row.long_term_score),
    };
  };

  const hiddenCount = async (accountId: number, channelId: number): Promise<number> =>
    asFiniteNumber(
      firstRow(
        await query(
          `SELECT count(*)::int AS total
             FROM stats_taste_profile_hidden h
             JOIN listener_identity.stats_listener l ON l.listener_id = h.listener_id
            WHERE l.account_id = $1 AND h.channel_id = $2`,
          [accountId, channelId]
        )
      ).total
    );

  const dailyCounts = async (channelId: number): Promise<DailyCounts> => {
    const row = firstRow(
      await query(
        `SELECT listener_count, completion_count
           FROM stats_daily_channel
          WHERE channel_id = $1 AND day = current_date`,
        [channelId]
      )
    );
    return {
      listener_count: asFiniteNumber(row.listener_count),
      completion_count: asFiniteNumber(row.completion_count),
    };
  };

  const authed = (account: SeededAccount) => authHeaders(account.id, account.idText);

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for the Taste Profile integration test');
    }
    manager = ormContext.dataSourceReadWrite.manager;
    accountBase = `${await getBaseApiUrl()}/account`;

    owner = await seedAccount('owner');
    emptyAccount = await seedAccount('empty');
    expiredAccount = await seedAccount('expired');

    channels = {
      c1: await seedChannel('c1', 0),
      c2: await seedChannel('c2', 1),
      c3: await seedChannel('c3', 2),
      c4: await seedChannel('c4', 3),
      c5: await seedChannel('c5', 4),
    };

    ownerListenerId = await seedListener(owner.id);
    await insertTaste(ownerListenerId, channels.c1.id, TASTE.c1);
    await insertTaste(ownerListenerId, channels.c2.id, TASTE.c2);
    await insertTaste(ownerListenerId, channels.c3.id, TASTE.c3);
    await query(
      `INSERT INTO stats_taste_profile_hidden (listener_id, channel_id, hidden_at)
       VALUES ($1::uuid, $2, $3)`,
      [ownerListenerId, channels.c4.id, HIDDEN_AT]
    );
    await query(
      `INSERT INTO stats_daily_channel (channel_id, day, listener_count, completion_count)
       VALUES ($1, current_date, $2, $3)`,
      [channels.c1.id, DAILY_LISTENER_COUNT, DAILY_COMPLETION_COUNT]
    );

    const expiredListenerId = await seedListener(expiredAccount.id);
    await insertTaste(expiredListenerId, channels.c5.id, {
      listen: 2,
      completion: 1,
      recent: 1,
      longTerm: 1,
      first: '2026-05-01T00:00:00.000Z',
      last: '2026-05-02T00:00:00.000Z',
    });
    await query(
      `UPDATE account_membership_status
          SET membership_expires_at = '1999-01-01 00:00:00'
        WHERE account_id = $1`,
      [expiredAccount.id]
    );
    const expiresAt = firstRow(
      await query(
        'SELECT membership_expires_at FROM account_membership_status WHERE account_id = $1',
        [expiredAccount.id]
      )
    ).membership_expires_at;
    const expiresMs =
      expiresAt instanceof Date
        ? expiresAt.getTime()
        : typeof expiresAt === 'string'
          ? Date.parse(expiresAt)
          : Number.NaN;
    if (!Number.isFinite(expiresMs) || expiresMs >= Date.now()) {
      throw new Error('expected an expired membership');
    }
  }, 90000);

  afterAll(async () => {
    if (ormContext) {
      const { AccountService } = await import('@podverse/orm');
      const accountService = new AccountService();
      for (const accountId of createdAccountIds) {
        await accountService.delete(accountId);
      }
      if (createdFeedIds.length > 0) {
        await query('DELETE FROM feed WHERE id = ANY($1::int[])', [createdFeedIds]);
      }
    }
    await stopTestApp(server, ormContext);
  });

  it('answers 401 on each Taste Profile route without auth', async () => {
    const list = await request(app).get(`${accountBase}/taste-profile`);
    const hidden = await request(app).get(`${accountBase}/taste-profile/hidden`);
    const hide = await request(app)
      .post(`${accountBase}/taste-profile/hide`)
      .send({ channel_id_text: channels.c1.idText });
    const unhide = await request(app).post(`${accountBase}/taste-profile/unhide`).send({
      channel_id_text: channels.c4.idText,
      add_to_taste_profile: false,
    });

    expect(list.status).toBe(401);
    expect(hidden.status).toBe(401);
    expect(hide.status).toBe(401);
    expect(unhide.status).toBe(401);
  });

  it('lists the Taste Profile newest listen first and omits the listener id', async () => {
    const res = await request(app).get(`${accountBase}/taste-profile`).set(authed(owner));

    expect(res.status).toBe(200);
    expect(res.text).not.toContain(ownerListenerId);
    expect(res.text).not.toContain('listener_id');
    const items = listItems(res.body);
    expect(items.map(channelIdText)).toEqual([
      channels.c1.idText,
      channels.c2.idText,
      channels.c3.idText,
    ]);
    expect(responseData(res.body).pagination).toEqual({ page: 1, total_count: 3, total_pages: 1 });
    expect(items[0]).toMatchObject({
      listen_count: TASTE.c1.listen,
      completion_count: TASTE.c1.completion,
      first_listened_at: TASTE.c1.first,
      last_listened_at: TASTE.c1.last,
      recommendation_weight: 1,
      recommendation_weight_override: null,
    });
    for (const [row, channel] of [
      [items[0], channels.c1],
      [items[1], channels.c2],
      [items[2], channels.c3],
    ] as const) {
      expect(row?.channel).toMatchObject({
        id_text: channel.idText,
        title: channel.title,
        medium_id: MediumEnum.Podcast,
        channel_images: [{ url: channel.imageUrl, image_width_size: 600, is_resized: false }],
      });
    }
  });

  it('returns the second page as one row with two pages total', async () => {
    const res = await request(app)
      .get(`${accountBase}/taste-profile?limit=2&page=2`)
      .set(authed(owner));

    expect(res.status).toBe(200);
    const items = listItems(res.body);
    expect(items.map(channelIdText)).toEqual([channels.c3.idText]);
    expect(responseData(res.body).pagination).toEqual({ page: 2, total_count: 3, total_pages: 2 });
  });

  it('returns empty lists for an account with no listener row', async () => {
    const list = await request(app).get(`${accountBase}/taste-profile`).set(authed(emptyAccount));
    const hidden = await request(app)
      .get(`${accountBase}/taste-profile/hidden`)
      .set(authed(emptyAccount));

    expect(list.status).toBe(200);
    expect(hidden.status).toBe(200);
    expect(list.body).toEqual({
      data: { items: [], pagination: { page: 1, total_count: 0, total_pages: 0 } },
    });
    expect(hidden.body).toEqual({
      data: { items: [], pagination: { page: 1, total_count: 0, total_pages: 0 } },
    });
  });

  it('lists shows left out of recommendations', async () => {
    const res = await request(app).get(`${accountBase}/taste-profile/hidden`).set(authed(owner));

    expect(res.status).toBe(200);
    expect(res.text).not.toContain(ownerListenerId);
    expect(res.text).not.toContain('listener_id');
    const items = listItems(res.body);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      hidden_at: HIDDEN_AT,
      channel: {
        id_text: channels.c4.idText,
        title: channels.c4.title,
        medium_id: MediumEnum.Podcast,
      },
    });
    expect(responseData(res.body).pagination).toEqual({ page: 1, total_count: 1, total_pages: 1 });
  });

  it('hides a Taste Profile show, leaves the daily total, and hides it again', async () => {
    const dailyBefore = await dailyCounts(channels.c1.id);

    const first = await request(app)
      .post(`${accountBase}/taste-profile/hide`)
      .set(authed(owner))
      .send({ channel_id_text: channels.c1.idText });

    expect(first.status).toBe(200);
    expect(first.body).toEqual({
      data: {
        channel_id_text: channels.c1.idText,
        hidden: true,
        in_taste_profile: false,
      },
    });
    expect(await tasteCounts(owner.id, channels.c1.id)).toBeNull();
    expect(await hiddenCount(owner.id, channels.c1.id)).toBe(1);
    expect(await dailyCounts(channels.c1.id)).toEqual(dailyBefore);
    expect(dailyBefore).toEqual({
      listener_count: DAILY_LISTENER_COUNT,
      completion_count: DAILY_COMPLETION_COUNT,
    });

    const second = await request(app)
      .post(`${accountBase}/taste-profile/hide`)
      .set(authed(owner))
      .send({ channel_id_text: channels.c1.idText });

    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(await hiddenCount(owner.id, channels.c1.id)).toBe(1);
    expect(await dailyCounts(channels.c1.id)).toEqual(dailyBefore);
  });

  it('answers 404 for a show outside the Taste Profile and for an unknown channel', async () => {
    const missing = await request(app)
      .post(`${accountBase}/taste-profile/hide`)
      .set(authed(owner))
      .send({ channel_id_text: channels.c5.idText });
    const unknown = await request(app)
      .post(`${accountBase}/taste-profile/hide`)
      .set(authed(owner))
      .send({ channel_id_text: UNKNOWN_CHANNEL_ID_TEXT });

    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ message: 'Show is not in the Taste Profile' });
    expect(unknown.status).toBe(404);
    expect(unknown.body).toEqual({ message: 'Channel not found' });
    expect(await tasteCounts(owner.id, channels.c5.id)).toBeNull();
    expect(await hiddenCount(owner.id, channels.c5.id)).toBe(0);
  });

  it('unhides a show without adding it back', async () => {
    const res = await request(app)
      .post(`${accountBase}/taste-profile/unhide`)
      .set(authed(owner))
      .send({ channel_id_text: channels.c4.idText, add_to_taste_profile: false });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        channel_id_text: channels.c4.idText,
        hidden: false,
        in_taste_profile: false,
      },
    });
    expect(await hiddenCount(owner.id, channels.c4.id)).toBe(0);
    expect(await tasteCounts(owner.id, channels.c4.id)).toBeNull();
  });

  it('adds a hidden show back as a fresh row and reports null listen times', async () => {
    const res = await request(app)
      .post(`${accountBase}/taste-profile/unhide`)
      .set(authed(owner))
      .send({ channel_id_text: channels.c1.idText, add_to_taste_profile: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        channel_id_text: channels.c1.idText,
        hidden: false,
        in_taste_profile: true,
      },
    });
    expect(await hiddenCount(owner.id, channels.c1.id)).toBe(0);
    expect(await tasteCounts(owner.id, channels.c1.id)).toEqual({
      listen_count: 0,
      completion_count: 0,
      recent_score: 0,
      long_term_score: 0,
    });

    const list = await request(app).get(`${accountBase}/taste-profile`).set(authed(owner));
    expect(list.status).toBe(200);
    const addedBack = listItems(list.body).find((row) => channelIdText(row) === channels.c1.idText);
    expect(addedBack).toMatchObject({
      listen_count: 0,
      completion_count: 0,
      first_listened_at: null,
      last_listened_at: null,
    });
  });

  it('leaves a show that is not hidden unchanged when unhide asks to add it back', async () => {
    const before = await tasteCounts(owner.id, channels.c2.id);

    const res = await request(app)
      .post(`${accountBase}/taste-profile/unhide`)
      .set(authed(owner))
      .send({ channel_id_text: channels.c2.idText, add_to_taste_profile: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        channel_id_text: channels.c2.idText,
        hidden: false,
        in_taste_profile: true,
      },
    });
    expect(before).toEqual({
      listen_count: TASTE.c2.listen,
      completion_count: TASTE.c2.completion,
      recent_score: TASTE.c2.recent,
      long_term_score: TASTE.c2.longTerm,
    });
    expect(await tasteCounts(owner.id, channels.c2.id)).toEqual(before);
  });

  it('answers 400 when unhide omits add_to_taste_profile', async () => {
    const before = await tasteCounts(owner.id, channels.c3.id);

    const res = await request(app)
      .post(`${accountBase}/taste-profile/unhide`)
      .set(authed(owner))
      .send({ channel_id_text: channels.c3.idText });

    expect(res.status).toBe(400);
    expect(await tasteCounts(owner.id, channels.c3.id)).toEqual(before);
  });

  it('still lists and hides for an account whose membership has expired', async () => {
    const list = await request(app).get(`${accountBase}/taste-profile`).set(authed(expiredAccount));
    expect(list.status).toBe(200);
    expect(list.text).not.toContain('listener_id');
    expect(responseData(list.body).pagination).toEqual({
      page: 1,
      total_count: 1,
      total_pages: 1,
    });
    expect(listItems(list.body).map(channelIdText)).toEqual([channels.c5.idText]);

    const hide = await request(app)
      .post(`${accountBase}/taste-profile/hide`)
      .set(authed(expiredAccount))
      .send({ channel_id_text: channels.c5.idText });

    expect(hide.status).toBe(200);
    expect(hide.body).toEqual({
      data: {
        channel_id_text: channels.c5.idText,
        hidden: true,
        in_taste_profile: false,
      },
    });
    expect(await tasteCounts(expiredAccount.id, channels.c5.id)).toBeNull();
    expect(await hiddenCount(expiredAccount.id, channels.c5.id)).toBe(1);
  });

  it('lists recommendations for the chip and leaves out subscribed shows', async () => {
    const album = await seedChannel('album', 20, MediumEnum.Music);
    await query(
      `INSERT INTO stats_recommendation (listener_id, channel_id, score, strength, computed_at)
       VALUES ($1::uuid, $2, 9, 5, now()), ($1::uuid, $3, 4, 2, now()), ($1::uuid, $4, 8, 4, now())`,
      [ownerListenerId, channels.c1.id, channels.c2.id, album.id]
    );
    await query(`INSERT INTO account_following_channel (account_id, channel_id) VALUES ($1, $2)`, [
      owner.id,
      channels.c2.id,
    ]);

    const podcasts = await request(app)
      .get(`${accountBase}/recommendations?chip=podcasts`)
      .set(authed(owner));
    const albums = await request(app)
      .get(`${accountBase}/recommendations?chip=albums`)
      .set(authed(owner));

    expect(podcasts.status).toBe(200);
    expect(podcasts.text).not.toContain(ownerListenerId);
    expect(podcasts.text).not.toContain('listener_id');
    expect(listItems(podcasts.body).map(channelIdText)).toEqual([channels.c1.idText]);
    expect(listItems(podcasts.body)[0]).toMatchObject({ strength: 5 });
    expect(albums.status).toBe(200);
    expect(listItems(albums.body).map(channelIdText)).toEqual([album.idText]);
    expect(listItems(albums.body)[0]).toMatchObject({ strength: 4 });
  });

  it('applies a recommendation weight and rejects a show that is not in the Taste Profile', async () => {
    const applied = await request(app)
      .post(`${accountBase}/taste-profile/weight`)
      .set(authed(owner))
      .send({ channel_id_text: channels.c1.idText, weight: 4 });

    expect(applied.status).toBe(200);
    expect(applied.body).toEqual({
      data: { channel_id_text: channels.c1.idText, weight: 4 },
    });

    const list = await request(app).get(`${accountBase}/taste-profile`).set(authed(owner));
    expect(listItems(list.body)[0]).toMatchObject({
      recommendation_weight: 4,
      recommendation_weight_override: 4,
    });

    const missing = await request(app)
      .post(`${accountBase}/taste-profile/weight`)
      .set(authed(owner))
      .send({ channel_id_text: UNKNOWN_CHANNEL_ID_TEXT, weight: 2 });
    expect(missing.status).toBe(404);

    const hidden = await request(app)
      .post(`${accountBase}/taste-profile/weight`)
      .set(authed(owner))
      .send({ channel_id_text: channels.c4.idText, weight: 2 });
    expect(hidden.status).toBe(404);
  });

  it('hides a channel from lists immediately and lists it under Hidden Channels', async () => {
    const suggested = await seedChannel('suggested', 30);
    await query(
      `INSERT INTO stats_recommendation (listener_id, channel_id, score, strength, computed_at)
       VALUES ($1::uuid, $2, 6, 4, now())`,
      [ownerListenerId, suggested.id]
    );

    const hide = await request(app)
      .post(`${accountBase}/channel-hidden/hide`)
      .set(authed(owner))
      .send({ channel_id_text: suggested.idText });
    expect(hide.status).toBe(200);
    expect(hide.body).toEqual({
      data: { channel_id_text: suggested.idText, hidden: true },
    });
    expect(hide.text).not.toContain(ownerListenerId);
    expect(hide.text).not.toContain('listener_id');

    const remaining = await request(app)
      .get(`${accountBase}/recommendations?chip=podcasts`)
      .set(authed(owner));
    expect(listItems(remaining.body).map(channelIdText)).not.toContain(suggested.idText);

    const browseBase = await getBaseApiUrl();
    const browse = await request(app)
      .get(`${browseBase}/channel/global/recent?medium=podcasts&page=1`)
      .set(authed(owner));
    expect(browse.status).toBe(200);
    const browseData: unknown = browse.body?.data;
    const browseIds = Array.isArray(browseData)
      ? browseData
          .filter((row): row is { id_text: string } => {
            if (typeof row !== 'object' || row === null || !('id_text' in row)) {
              return false;
            }
            return typeof row.id_text === 'string';
          })
          .map((row) => row.id_text)
      : [];
    expect(browseIds).not.toContain(suggested.idText);

    const hiddenList = await request(app)
      .get(`${accountBase}/channel-hidden`)
      .set(authed(owner));
    expect(hiddenList.status).toBe(200);
    expect(hiddenList.text).not.toContain(ownerListenerId);
    expect(listItems(hiddenList.body).map(channelIdText)).toContain(suggested.idText);

    const unhide = await request(app)
      .post(`${accountBase}/channel-hidden/unhide`)
      .set(authed(owner))
      .send({ channel_id_text: suggested.idText });
    expect(unhide.status).toBe(200);
    expect(unhide.body).toEqual({
      data: { channel_id_text: suggested.idText, hidden: false },
    });

    const afterUnhide = await request(app).get(`${accountBase}/channel-hidden`).set(authed(owner));
    expect(listItems(afterUnhide.body).map(channelIdText)).not.toContain(suggested.idText);
  });

  it('rebuilds recommendations when the applied weight changes and skips the same weight', async () => {
    const filler = await seedChannel('weight-refresh', 31);
    const seedRecommendation = async () => {
      await query(
        `INSERT INTO stats_recommendation (listener_id, channel_id, score, strength, computed_at)
         VALUES ($1::uuid, $2, 3, 2, now())
         ON CONFLICT (listener_id, channel_id) DO UPDATE
           SET score = EXCLUDED.score, strength = EXCLUDED.strength,
               computed_at = EXCLUDED.computed_at`,
        [ownerListenerId, filler.id]
      );
    };
    const recommendationCount = async () =>
      asFiniteNumber(
        firstRow(
          await query(
            `SELECT count(*)::int AS total FROM stats_recommendation
              WHERE listener_id = $1::uuid AND channel_id = $2`,
            [ownerListenerId, filler.id]
          )
        ).total
      );

    await request(app)
      .post(`${accountBase}/taste-profile/weight`)
      .set(authed(owner))
      .send({ channel_id_text: channels.c2.idText, weight: 3 });
    await seedRecommendation();

    const sameWeight = await request(app)
      .post(`${accountBase}/taste-profile/weight`)
      .set(authed(owner))
      .send({ channel_id_text: channels.c2.idText, weight: 3 });
    expect(sameWeight.status).toBe(200);
    expect(await recommendationCount()).toBe(1);

    const changedWeight = await request(app)
      .post(`${accountBase}/taste-profile/weight`)
      .set(authed(owner))
      .send({ channel_id_text: channels.c2.idText, weight: 5 });
    expect(changedWeight.status).toBe(200);
    expect(await recommendationCount()).toBe(0);
  });
});
