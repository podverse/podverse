/**
 * Public recent and top lists take an optional exact tag and page the matches.
 */
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  getQueueMediumIdFromType,
  PAGINATION,
  PLAYLIST_TAG_NAME_MAX_LENGTH,
  SharableStatusEnum,
} from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  getBaseApiUrl,
  IntegrationTestNoopCategoryService,
  startTestApp,
  stopTestApp,
} from './helpers/index.js';

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  return {
    ...actual,
    CategoryService: IntegrationTestNoopCategoryService,
  };
});

type EntityManager = ORMContext['dataSourceReadWrite']['manager'];

type PlaylistRow = {
  idText: string;
  tags: string[];
};

type LastUpdated = {
  sql: string;
  params: unknown[];
};

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

function asId(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    return Number(value);
  }
  throw new Error('expected an id');
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function readRows(body: unknown): PlaylistRow[] {
  if (!isRecord(body) || !Array.isArray(body.data)) {
    throw new Error('playlist list response must include data');
  }
  return body.data.map((item) => {
    if (!isRecord(item) || typeof item.id_text !== 'string' || !isStringArray(item.tags)) {
      throw new Error('playlist row is missing id_text or tags');
    }
    return { idText: item.id_text, tags: item.tags };
  });
}

describe('public playlist tag filter (real database)', () => {
  let server: Server | undefined;
  let httpApp: import('express').Express | undefined;
  let ormContext: ORMContext | undefined;
  let manager: EntityManager | undefined;
  let apiBase = '';
  const playlistIds: number[] = [];
  const accountIds: number[] = [];
  const runId = Date.now();
  const idSuffix = String(runId % 100_000_000).padStart(8, '0');
  const pageSize = PAGINATION.DEFAULT_LIMIT;
  const pageTag = `page${idSuffix}`;
  const otherTag = `other${idSuffix}`;
  const topTag = `top${idSuffix}`;
  const topExtra = `extra${idSuffix}`;
  const adamExtra = `more${idSuffix}`;
  const untaggedNewerIdText = `u${idSuffix}a`;
  const untaggedOlderIdText = `u${idSuffix}b`;
  const privatePageIdText = `v${idSuffix}p`;
  const musicPageIdText = `w${idSuffix}m`;
  const adamShortIdText = `a${idSuffix}s`;
  const curryIdText = `a${idSuffix}c`;
  const rankedIdText = `k${idSuffix}a`;
  const weekIdText = `k${idSuffix}b`;
  const pageIdTexts: string[] = [];
  let seededAccountId = 0;

  function app(): import('express').Express {
    if (httpApp === undefined) {
      throw new Error('test app is not running');
    }
    return httpApp;
  }

  const query = async (sql: string, params: unknown[] = []): Promise<unknown> => {
    if (manager === undefined) {
      throw new Error('ORM manager required');
    }
    return manager.query(sql, params);
  };

  const insertReturningId = async (sql: string, params: unknown[]): Promise<number> => {
    return asId(firstRow(await query(sql, params)).id);
  };

  const insertPlaylist = async (
    idText: string,
    sharableStatusId: number,
    mediumId: number,
    lastUpdated: LastUpdated
  ): Promise<number> => {
    const id = await insertReturningId(
      `INSERT INTO playlist
         (id_text, account_id, sharable_status_id, medium_id, title, last_updated)
       VALUES ($1, $2, $3, $4, $5, ${lastUpdated.sql})
       RETURNING id`,
      [idText, seededAccountId, sharableStatusId, mediumId, `Tags ${idText}`, ...lastUpdated.params]
    );
    playlistIds.push(id);
    return id;
  };

  const insertStats = async (
    playlistId: number,
    dayCount: number,
    weekCount: number
  ): Promise<void> => {
    await query(
      `INSERT INTO stats_popularity_playlist
         (playlist_id, day_count, week_count, month_count, all_time_count)
       VALUES ($1, $2, $3, 0, 0)`,
      [playlistId, dayCount, weekCount]
    );
  };

  async function getRecent(queryParams: Record<string, string | number>): Promise<PlaylistRow[]> {
    const res = await request(app()).get(`${apiBase}/playlist/public/recent`).query(queryParams);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return readRows(res.body);
  }

  async function getTop(queryParams: Record<string, string | number>): Promise<PlaylistRow[]> {
    const res = await request(app()).get(`${apiBase}/playlist/public/top`).query(queryParams);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return readRows(res.body);
  }

  function expectUntagged(rows: PlaylistRow[]): void {
    const newerIndex = rows.findIndex((row) => row.idText === untaggedNewerIdText);
    const olderIndex = rows.findIndex((row) => row.idText === untaggedOlderIdText);
    expect(newerIndex).toBeGreaterThanOrEqual(0);
    expect(olderIndex).toBeGreaterThan(newerIndex);
    const newer = rows[newerIndex];
    if (newer === undefined) {
      throw new Error('untagged playlist was not on recent');
    }
    expect(newer.tags).toEqual([]);
  }

  beforeAll(async () => {
    const started = await startTestApp();
    httpApp = started.app;
    server = started.server;
    ormContext = started.ormContext;
    manager = ormContext?.dataSourceReadWrite.manager;
    if (manager === undefined) {
      throw new Error('ORM context required for the public playlist tag filter test');
    }
    apiBase = await getBaseApiUrl();

    const avMediumId = getQueueMediumIdFromType('av');
    const musicMediumId = getQueueMediumIdFromType('music');
    if (avMediumId === null || musicMediumId === null) {
      throw new Error('Queue medium ids are required to seed playlists');
    }

    const { AccountService, PlaylistTagService } = await import('@podverse/orm');
    const email = `playlist-public-tag-filter-${runId}@example.com`;
    const accountService = new AccountService();
    await accountService.create({
      email,
      password: 'IntegrationTest1!',
      locale: 'en-US',
      terms_version: '2026-10-15',
    });
    const account = await accountService.getByEmail(email);
    if (account === null || account === undefined) {
      throw new Error('Failed to load the public playlist tag filter account');
    }
    seededAccountId = account.id;
    accountIds.push(account.id);
    await query(`UPDATE account SET sharable_status_id = $2 WHERE id = $1`, [
      account.id,
      SharableStatusEnum.Public,
    ]);

    const now: LastUpdated = { sql: 'now()', params: [] };
    const future30: LastUpdated = { sql: "now() + interval '30 years'", params: [] };
    const future30Older: LastUpdated = {
      sql: "now() + interval '30 years' - interval '1 second'",
      params: [],
    };
    const future31: LastUpdated = { sql: "now() + interval '31 years'", params: [] };
    const future32: LastUpdated = { sql: "now() + interval '32 years'", params: [] };
    const future40: LastUpdated = { sql: "now() + interval '40 years'", params: [] };

    await insertPlaylist(untaggedNewerIdText, SharableStatusEnum.Public, avMediumId, future30);
    await insertPlaylist(untaggedOlderIdText, SharableStatusEnum.Public, avMediumId, future30Older);

    const tagService = new PlaylistTagService();
    const indexWidth = String(pageSize).length;
    for (let index = 0; index < pageSize + 1; index += 1) {
      const idText = `f${idSuffix}${String(index).padStart(indexWidth, '0')}`;
      if (idText.length < 7 || idText.length > 15) {
        throw new Error('playlist id_text is outside nano_id_v2');
      }
      pageIdTexts.push(idText);
      const id = await insertPlaylist(idText, SharableStatusEnum.Public, avMediumId, {
        sql: "now() - interval '2 days' - ($6::int * interval '1 minute')",
        params: [index],
      });
      await tagService.replaceForPlaylist(id, [pageTag]);
    }

    const privatePageId = await insertPlaylist(
      privatePageIdText,
      SharableStatusEnum.Private,
      avMediumId,
      future40
    );
    await tagService.replaceForPlaylist(privatePageId, [pageTag]);
    const musicPageId = await insertPlaylist(
      musicPageIdText,
      SharableStatusEnum.Public,
      musicMediumId,
      future40
    );
    await tagService.replaceForPlaylist(musicPageId, [pageTag]);

    const adamShortId = await insertPlaylist(
      adamShortIdText,
      SharableStatusEnum.Public,
      avMediumId,
      future32
    );
    await tagService.replaceForPlaylist(adamShortId, ['adam']);
    const curryId = await insertPlaylist(
      curryIdText,
      SharableStatusEnum.Public,
      avMediumId,
      future31
    );
    await tagService.replaceForPlaylist(curryId, ['adam curry', adamExtra]);
    const otherId = await insertPlaylist(`o${idSuffix}x`, SharableStatusEnum.Public, avMediumId, {
      sql: "now() + interval '33 years'",
      params: [],
    });
    await tagService.replaceForPlaylist(otherId, [otherTag]);

    const rankedId = await insertPlaylist(rankedIdText, SharableStatusEnum.Public, avMediumId, now);
    await tagService.replaceForPlaylist(rankedId, [topTag, topExtra]);
    await insertStats(rankedId, 3, 0);

    const weekId = await insertPlaylist(weekIdText, SharableStatusEnum.Public, avMediumId, now);
    await tagService.replaceForPlaylist(weekId, [topTag]);
    await insertStats(weekId, 0, 4);

    const noneId = await insertPlaylist(
      `k${idSuffix}c`,
      SharableStatusEnum.Public,
      avMediumId,
      now
    );
    await tagService.replaceForPlaylist(noneId, [topTag]);

    const untaggedTopId = await insertPlaylist(
      `k${idSuffix}d`,
      SharableStatusEnum.Public,
      avMediumId,
      now
    );
    await insertStats(untaggedTopId, 12, 30);

    const otherTopId = await insertPlaylist(
      `k${idSuffix}e`,
      SharableStatusEnum.Public,
      avMediumId,
      now
    );
    await tagService.replaceForPlaylist(otherTopId, [otherTag]);
    await insertStats(otherTopId, 11, 21);

    const musicTopId = await insertPlaylist(
      `k${idSuffix}f`,
      SharableStatusEnum.Public,
      musicMediumId,
      now
    );
    await tagService.replaceForPlaylist(musicTopId, [topTag]);
    await insertStats(musicTopId, 15, 25);

    const privateTopId = await insertPlaylist(
      `k${idSuffix}g`,
      SharableStatusEnum.Private,
      avMediumId,
      now
    );
    await tagService.replaceForPlaylist(privateTopId, [topTag]);
    await insertStats(privateTopId, 20, 22);
  }, 180000);

  afterAll(async () => {
    try {
      if (manager !== undefined && playlistIds.length > 0) {
        await manager.query(`DELETE FROM playlist WHERE id = ANY($1::int[])`, [playlistIds]);
      }
      if (accountIds.length > 0) {
        const { AccountService } = await import('@podverse/orm');
        const accountService = new AccountService();
        for (const accountId of accountIds) {
          await accountService.delete(accountId);
        }
      }
    } finally {
      await stopTestApp(server, ormContext);
    }
  }, 60000);

  it('keeps an untagged public playlist on recent when tag is omitted or blank', async () => {
    expectUntagged(await getRecent({ medium: 'av', page: 1 }));

    const empty = await request(app()).get(
      `${apiBase}/playlist/public/recent?medium=av&page=1&tag=`
    );
    expect(empty.status, JSON.stringify(empty.body)).toBe(200);
    expectUntagged(readRows(empty.body));

    expectUntagged(await getRecent({ medium: 'av', page: 1, tag: '   ' }));
  });

  it('returns a later match on the second page of a tag', async () => {
    const tag = pageTag.toUpperCase();
    const page1 = await getRecent({ medium: 'av', page: 1, tag });
    const page2 = await getRecent({ medium: 'av', page: 2, tag });
    const oldest = pageIdTexts[pageSize];
    if (oldest === undefined) {
      throw new Error('paged playlist id is missing');
    }

    expect(page1).toEqual(
      pageIdTexts.slice(0, pageSize).map((idText) => ({ idText, tags: [pageTag] }))
    );
    expect(page1.map((row) => row.idText)).not.toContain(privatePageIdText);
    expect(page1.map((row) => row.idText)).not.toContain(musicPageIdText);
    expect(page1.map((row) => row.idText)).not.toContain(untaggedNewerIdText);
    expect(page2).toEqual([{ idText: oldest, tags: [pageTag] }]);
  });

  it('matches a folded tag and not a shorter name', async () => {
    const folded = await getRecent({ medium: 'av', page: 1, tag: 'ADAM CURRY' });
    const curry = folded.find((row) => row.idText === curryIdText);
    if (curry === undefined) {
      throw new Error('folded tag did not return the playlist');
    }
    expect(curry.tags).toEqual(['adam curry', adamExtra]);
    expect(folded.map((row) => row.idText)).not.toContain(adamShortIdText);
    expect(folded.map((row) => row.idText)).not.toContain(untaggedNewerIdText);

    const shorter = await getRecent({ medium: 'av', page: 1, tag: 'adam' });
    expect(shorter.map((row) => row.idText)).toContain(adamShortIdText);
    expect(shorter.map((row) => row.idText)).not.toContain(curryIdText);
  });

  it('returns 200 and an empty page for an unknown tag', async () => {
    const unknown = `missing${idSuffix}`;
    expect(await getRecent({ medium: 'av', page: 1, tag: unknown })).toEqual([]);
    expect(await getTop({ medium: 'av', page: 1, range: 'day', tag: unknown })).toEqual([]);

    const fifty = 'b'.repeat(PLAYLIST_TAG_NAME_MAX_LENGTH);
    expect(await getRecent({ medium: 'av', page: 1, tag: fifty })).toEqual([]);
    expect(await getTop({ medium: 'av', page: 1, range: 'day', tag: fifty })).toEqual([]);
  });

  it('returns 400 when tag is longer than 50 characters', async () => {
    const tooLong = 'a'.repeat(PLAYLIST_TAG_NAME_MAX_LENGTH + 1);
    const recent = await request(app())
      .get(`${apiBase}/playlist/public/recent`)
      .query({ medium: 'av', page: 1, tag: tooLong });
    expect(recent.status).toBe(400);

    const top = await request(app())
      .get(`${apiBase}/playlist/public/top`)
      .query({ medium: 'av', page: 1, range: 'day', tag: tooLong });
    expect(top.status).toBe(400);
  });

  it('returns only tagged playlists with a positive count for the range', async () => {
    const tag = topTag.toUpperCase();
    const day = await getTop({ medium: 'av', page: 1, range: 'day', tag });
    expect(day).toEqual([{ idText: rankedIdText, tags: [topTag, topExtra] }]);

    const week = await getTop({ medium: 'av', page: 1, range: 'week', tag });
    expect(week).toEqual([{ idText: weekIdText, tags: [topTag] }]);
  });
});
