/**
 * Playlist tag search reads folded names on public and unlisted playlists.
 * A search does not insert catalog rows.
 */
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  getQueueMediumIdFromType,
  PLAYLIST_TAG_NAME_MAX_LENGTH,
  PLAYLIST_TAG_SEARCH_LIMIT,
  SharableStatusEnum,
} from '@podverse/helpers';
import type { ORMContext, PlaylistTagService } from '@podverse/orm';

import { createApiKeyTestAccount } from './helpers/apiKeyTestAccounts.js';
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

const PUBLIC_NAME = 'adam curry';

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

function asCount(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    return Number(value);
  }
  throw new Error('expected a count');
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

function jwtCookie(setCookie: string | string[] | undefined): string {
  let cookies: string[];
  if (Array.isArray(setCookie)) {
    cookies = setCookie;
  } else if (setCookie === undefined) {
    cookies = [];
  } else {
    cookies = [setCookie];
  }
  const jwt = cookies.find((cookie) => cookie.startsWith('jwt='));
  if (jwt === undefined) {
    throw new Error('login did not set a jwt cookie');
  }
  const pair = jwt.split(';')[0];
  if (pair === undefined || pair.length === 0) {
    throw new Error('login did not set a jwt cookie');
  }
  return pair;
}

function tagNames(body: unknown): string[] {
  if (!isRecord(body) || !Array.isArray(body.data) || 'meta' in body) {
    throw new Error('tag search response must be { data: string[] }');
  }
  return body.data.map((item) => {
    if (typeof item !== 'string') {
      throw new Error('tag search data is not strings');
    }
    return item;
  });
}

describe('playlist tag search (real database)', () => {
  let server: Server | undefined;
  let httpApp: import('express').Express | undefined;
  let ormContext: ORMContext | undefined;
  let manager: EntityManager | undefined;
  let apiBase = '';
  let otherCookie = '';
  const playlistIds: number[] = [];
  const accountIds: number[] = [];
  const runId = Date.now();
  const idSuffix = String(runId % 100_000_000).padStart(8, '0');
  const privateName = `pv${idSuffix}`;
  const unlistedName = `un${idSuffix}`;
  const limitPrefix = `lm${idSuffix}`;
  const limitNames = Array.from({ length: PLAYLIST_TAG_SEARCH_LIMIT + 1 }, (_, index) => {
    return `${limitPrefix}${String(index).padStart(2, '0')}`;
  });

  function app(): import('express').Express {
    if (httpApp === undefined) {
      throw new Error('test app is not running');
    }
    return httpApp;
  }

  async function search(q: string, cookie?: string): Promise<string[]> {
    const pending = request(app()).get(`${apiBase}/playlist/tag`).query({ q });
    if (cookie !== undefined) {
      pending.set('Cookie', cookie);
    }
    const res = await pending;
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return tagNames(res.body);
  }

  async function catalogCount(name: string): Promise<number> {
    if (manager === undefined) {
      throw new Error('ORM context required for the playlist tag search integration test');
    }
    const rows = await manager.query(
      `SELECT COUNT(*)::int AS count FROM playlist_tag WHERE name = $1`,
      [name]
    );
    return asCount(firstRow(rows).count);
  }

  async function catalogSize(): Promise<number> {
    if (manager === undefined) {
      throw new Error('ORM context required for the playlist tag search integration test');
    }
    const rows = await manager.query(`SELECT COUNT(*)::int AS count FROM playlist_tag`);
    return asCount(firstRow(rows).count);
  }

  beforeAll(async () => {
    const started = await startTestApp({ accountSessions: 'real' });
    httpApp = started.app;
    server = started.server;
    ormContext = started.ormContext;
    manager = ormContext?.dataSourceReadWrite.manager;
    if (manager === undefined) {
      throw new Error('ORM context required for the playlist tag search integration test');
    }
    const db = manager;
    apiBase = await getBaseApiUrl();

    const owner = await createApiKeyTestAccount('playlist-tag-search-owner-');
    const other = await createApiKeyTestAccount('playlist-tag-search-other-');
    accountIds.push(owner.id, other.id);

    const login = await request(app()).post(`${apiBase}/auth/login`).send({
      email: other.email,
      password: other.password,
    });
    expect(login.status, JSON.stringify(login.body)).toBe(200);
    otherCookie = jwtCookie(login.headers['set-cookie']);

    const avMediumId = getQueueMediumIdFromType('av');
    if (avMediumId === null) {
      throw new Error('AV queue medium id is required to seed playlists');
    }

    const insertPlaylist = async (idText: string, sharableStatusId: number): Promise<number> => {
      const rows = await db.query(
        `INSERT INTO playlist
           (id_text, account_id, sharable_status_id, medium_id, title, last_updated)
         VALUES ($1, $2, $3, $4, $5, now())
         RETURNING id`,
        [idText, owner.id, sharableStatusId, avMediumId, `Tag ${idText}`]
      );
      const id = asId(firstRow(rows).id);
      playlistIds.push(id);
      return id;
    };

    const publicId = await insertPlaylist(`ptsp${idSuffix}`, SharableStatusEnum.Public);
    const limitId = await insertPlaylist(`ptsl${idSuffix}`, SharableStatusEnum.Public);
    const privateId = await insertPlaylist(`ptsv${idSuffix}`, SharableStatusEnum.Private);
    const unlistedId = await insertPlaylist(`ptsu${idSuffix}`, SharableStatusEnum.Unlisted);

    const { PlaylistTagService } = await import('@podverse/orm');
    const tags: PlaylistTagService = new PlaylistTagService();
    await tags.replaceForPlaylist(publicId, [PUBLIC_NAME]);
    await tags.replaceForPlaylist(privateId, [privateName]);
    await tags.replaceForPlaylist(unlistedId, [unlistedName]);
    await tags.replaceForPlaylist(limitId, limitNames, {
      maxCount: limitNames.length,
      maxLength: PLAYLIST_TAG_NAME_MAX_LENGTH,
    });
  }, 120000);

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
  });

  it('returns adam curry for a folded prefix and not for a later word', async () => {
    expect(await search('AD')).toContain(PUBLIC_NAME);
    expect(await search('curry')).not.toContain(PUBLIC_NAME);
  });

  it('omits a private-only name for a signed-out caller and another account', async () => {
    const q = privateName.toUpperCase();
    expect(await catalogCount(privateName)).toBe(1);
    expect(await search(q)).toEqual([]);
    expect(await search(q, otherCookie)).toEqual([]);
  });

  it('returns a name used on an unlisted playlist', async () => {
    expect(await search(unlistedName.toUpperCase())).toEqual([unlistedName]);
  });

  it('returns 400 when q is missing, blank, or longer than 50 characters', async () => {
    const missing = await request(app()).get(`${apiBase}/playlist/tag`);
    expect(missing.status).toBe(400);

    const blank = await request(app()).get(`${apiBase}/playlist/tag`).query({ q: '   ' });
    expect(blank.status).toBe(400);

    const tooLong = await request(app())
      .get(`${apiBase}/playlist/tag`)
      .query({ q: 'a'.repeat(PLAYLIST_TAG_NAME_MAX_LENGTH + 1) });
    expect(tooLong.status).toBe(400);
  });

  it('returns at most 10 names ordered by name when more than 10 share the prefix', async () => {
    const names = await search(limitPrefix.toUpperCase());
    const ordered = [...limitNames].sort((left, right) => {
      if (left < right) {
        return -1;
      }
      if (left > right) {
        return 1;
      }
      return 0;
    });
    expect(names).toEqual(ordered.slice(0, PLAYLIST_TAG_SEARCH_LIMIT));
  });

  it('does not insert a playlist tag row when the search matches nothing', async () => {
    const before = await catalogSize();
    expect(await search(`zz${idSuffix}none`)).toEqual([]);
    expect(await catalogSize()).toBe(before);
  });
});
