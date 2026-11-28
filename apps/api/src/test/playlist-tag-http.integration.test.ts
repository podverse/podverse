/**
 * Playlist create and edit save tags. List and detail payloads include them
 * when the viewer may see them.
 */
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { SharableStatusEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

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

function jwtCookie(setCookie: string | string[] | undefined): string {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie === undefined ? [] : [setCookie];
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

function playlistRows(body: unknown): Record<string, unknown>[] {
  if (!isRecord(body) || !Array.isArray(body.data)) {
    throw new Error('playlist list missing data');
  }
  return body.data.filter(isRecord);
}

function rowByIdText(body: unknown, idText: string): Record<string, unknown> {
  const row = playlistRows(body).find((item) => item.id_text === idText);
  if (row === undefined) {
    throw new Error(`playlist ${idText} was not in the list`);
  }
  return row;
}

describe('playlist tag HTTP (real database)', () => {
  let server: Server | undefined;
  let httpApp: import('express').Express | undefined;
  let ormContext: ORMContext | undefined;
  let manager: EntityManager | undefined;
  let apiBase = '';
  let ownerCookie = '';
  let accountId: number | undefined;
  const createdIdTexts: string[] = [];
  const runId = String(Date.now());
  const morning = `morning${runId}`;
  const commute = `commute${runId}`;
  const evening = `evening${runId}`;
  const secret = `secret${runId}`;
  const unlistedName = `unlisted${runId}`;
  const recentA = `recenta${runId}`;
  const recentB = `recentb${runId}`;

  function createBody(sharableStatusId: number, tags?: string[]): Record<string, unknown> {
    const body: Record<string, unknown> = {
      title: 'Tagged playlist',
      description: 'A playlist with tags',
      medium: 'av',
      sharable_status_id: sharableStatusId,
    };
    if (tags !== undefined) {
      body.tags = tags;
    }
    return body;
  }

  function editBody(sharableStatusId: number, tags?: string[]): Record<string, unknown> {
    const body: Record<string, unknown> = {
      title: 'Tagged playlist',
      description: 'A playlist with tags',
      sharable_status_id: sharableStatusId,
    };
    if (tags !== undefined) {
      body.tags = tags;
    }
    return body;
  }

  function app(): import('express').Express {
    if (httpApp === undefined) {
      throw new Error('test app is not running');
    }
    return httpApp;
  }

  async function createPlaylist(body: Record<string, unknown>): Promise<string> {
    const res = await request(app())
      .post(`${apiBase}/playlist`)
      .set('Cookie', ownerCookie)
      .send(body);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    if (!isRecord(res.body) || typeof res.body.id_text !== 'string') {
      throw new Error('create playlist response missing id_text');
    }
    createdIdTexts.push(res.body.id_text);
    return res.body.id_text;
  }

  async function catalogCount(name: string): Promise<number> {
    if (manager === undefined) {
      throw new Error('ORM context required for the playlist tag HTTP integration test');
    }
    const rows = await manager.query(
      `SELECT COUNT(*)::int AS count FROM playlist_tag WHERE name = $1`,
      [name]
    );
    return asCount(firstRow(rows).count);
  }

  beforeAll(async () => {
    const started = await startTestApp({ accountSessions: 'real' });
    httpApp = started.app;
    server = started.server;
    ormContext = started.ormContext;
    manager = ormContext?.dataSourceReadWrite.manager;
    if (manager === undefined) {
      throw new Error('ORM context required for the playlist tag HTTP integration test');
    }
    apiBase = await getBaseApiUrl();

    const account = await createApiKeyTestAccount('playlist-tag-http-');
    accountId = account.id;
    const login = await request(app()).post(`${apiBase}/auth/login`).send({
      email: account.email,
      password: account.password,
    });
    expect(login.status, JSON.stringify(login.body)).toBe(200);
    ownerCookie = jwtCookie(login.headers['set-cookie']);
  }, 120000);

  afterAll(async () => {
    try {
      if (manager !== undefined && createdIdTexts.length > 0) {
        await manager.query(`DELETE FROM playlist WHERE id_text = ANY($1::text[])`, [
          createdIdTexts,
        ]);
      }
      if (accountId !== undefined) {
        const { AccountService } = await import('@podverse/orm');
        await new AccountService().delete(accountId);
      }
    } finally {
      await stopTestApp(server, ormContext);
    }
  });

  it('saves tags on create and replaces or clears them on edit', async () => {
    const idText = await createPlaylist(
      createBody(SharableStatusEnum.Public, [`  ${morning.toUpperCase()} `, commute])
    );

    const ownerGet = await request(app())
      .get(`${apiBase}/playlist/${idText}`)
      .set('Cookie', ownerCookie);
    expect(ownerGet.status, JSON.stringify(ownerGet.body)).toBe(200);
    expect(isRecord(ownerGet.body) ? ownerGet.body.tags : undefined).toEqual([morning, commute]);

    const publicGet = await request(app()).get(`${apiBase}/playlist/${idText}`);
    expect(publicGet.status, JSON.stringify(publicGet.body)).toBe(200);
    expect(isRecord(publicGet.body) ? publicGet.body.tags : undefined).toEqual([morning, commute]);

    const leave = await request(app())
      .patch(`${apiBase}/playlist/${idText}`)
      .set('Cookie', ownerCookie)
      .send(editBody(SharableStatusEnum.Public));
    expect(leave.status, JSON.stringify(leave.body)).toBe(200);
    const afterLeave = await request(app()).get(`${apiBase}/playlist/${idText}`);
    const leftTags = isRecord(afterLeave.body) ? afterLeave.body.tags : undefined;
    expect(leftTags).toEqual([morning, commute]);

    const replace = await request(app())
      .patch(`${apiBase}/playlist/${idText}`)
      .set('Cookie', ownerCookie)
      .send(editBody(SharableStatusEnum.Public, [evening]));
    expect(replace.status, JSON.stringify(replace.body)).toBe(200);
    const afterReplace = await request(app()).get(`${apiBase}/playlist/${idText}`);
    expect(isRecord(afterReplace.body) ? afterReplace.body.tags : undefined).toEqual([evening]);

    const clear = await request(app())
      .patch(`${apiBase}/playlist/${idText}`)
      .set('Cookie', ownerCookie)
      .send(editBody(SharableStatusEnum.Public, []));
    expect(clear.status, JSON.stringify(clear.body)).toBe(200);
    const afterClear = await request(app()).get(`${apiBase}/playlist/${idText}`);
    expect(isRecord(afterClear.body) ? afterClear.body.tags : undefined).toEqual([]);
    expect(await catalogCount(evening)).toBe(0);
  });

  it('returns private tags to the owner and 404 when signed out', async () => {
    const idText = await createPlaylist(createBody(SharableStatusEnum.Private, [secret]));

    const ownerGet = await request(app())
      .get(`${apiBase}/playlist/${idText}`)
      .set('Cookie', ownerCookie);
    expect(ownerGet.status, JSON.stringify(ownerGet.body)).toBe(200);
    expect(isRecord(ownerGet.body) ? ownerGet.body.tags : undefined).toEqual([secret]);

    const signedOut = await request(app()).get(`${apiBase}/playlist/${idText}`);
    expect(signedOut.status).toBe(404);

    const list = await request(app())
      .get(`${apiBase}/playlist/private/recent?medium=av&page=1`)
      .set('Cookie', ownerCookie);
    expect(list.status, JSON.stringify(list.body)).toBe(200);
    expect(rowByIdText(list.body, idText).tags).toEqual([secret]);
  });

  it('includes tags on an unlisted playlist for a signed-out caller', async () => {
    const idText = await createPlaylist(createBody(SharableStatusEnum.Unlisted, [unlistedName]));

    const signedOut = await request(app()).get(`${apiBase}/playlist/${idText}`);
    expect(signedOut.status, JSON.stringify(signedOut.body)).toBe(200);
    expect(isRecord(signedOut.body) ? signedOut.body.tags : undefined).toEqual([unlistedName]);
  });

  it('includes public recent tags, and an empty array when there are none', async () => {
    if (manager === undefined) {
      throw new Error('ORM context required for the playlist tag HTTP integration test');
    }
    const taggedIdText = await createPlaylist(
      createBody(SharableStatusEnum.Public, [recentA, recentB])
    );
    const untaggedIdText = await createPlaylist(createBody(SharableStatusEnum.Public));
    await manager.query(
      `UPDATE playlist SET last_updated = '9999-01-01' WHERE id_text = ANY($1::text[])`,
      [[taggedIdText, untaggedIdText]]
    );

    const list = await request(app()).get(`${apiBase}/playlist/public/recent?medium=av&page=1`);
    expect(list.status, JSON.stringify(list.body)).toBe(200);
    expect(rowByIdText(list.body, taggedIdText).tags).toEqual([recentA, recentB]);
    expect(rowByIdText(list.body, untaggedIdText).tags).toEqual([]);
  });
});
