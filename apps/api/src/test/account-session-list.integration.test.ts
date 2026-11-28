import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE } from '@podverse/helpers';
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

const TEST_PASSWORD = 'IntegrationTest1!';
const CHROME_MAC_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FIREFOX_WINDOWS_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0';
const CHROME_MAC_LABEL = 'Chrome · macOS';
const FIREFOX_WINDOWS_LABEL = 'Firefox · Windows';
const PHONE_LABEL = 'Test Phone';

const SESSION_DTO_KEYS = [
  'client_type',
  'created_at',
  'device_label',
  'id_text',
  'is_current',
  'last_seen_at',
];

type TestAccount = { id: number; email: string };

type SessionDto = {
  id_text: string;
  client_type: string;
  device_label: string | null;
  created_at: string;
  last_seen_at: string;
  is_current: boolean;
};

function setCookies(res: request.Response): string[] {
  const header: unknown = res.headers['set-cookie'];
  if (Array.isArray(header)) {
    return header.filter((value): value is string => typeof value === 'string');
  }
  return typeof header === 'string' ? [header] : [];
}

/** The `jwt` cookie value the response sets, '' when it clears the cookie, null when absent. */
function jwtCookieValue(res: request.Response): string | null {
  const cookie = setCookies(res).find((value) => value.startsWith('jwt='));
  if (cookie === undefined) {
    return null;
  }
  return cookie.slice('jwt='.length).split(';')[0] ?? '';
}

function expectJwtCookieCleared(res: request.Response): void {
  const cookie = setCookies(res).find((value) => value.startsWith('jwt='));
  expect(cookie).toBeDefined();
  expect(jwtCookieValue(res)).toBe('');
  expect(cookie).toContain('Expires=Thu, 01 Jan 1970');
}

function readClaim(token: string, claim: string): string {
  const decoded = jwt.decode(token);
  const value: unknown =
    typeof decoded === 'object' && decoded !== null ? Reflect.get(decoded, claim) : undefined;
  if (typeof value !== 'string') {
    throw new Error(`Token has no ${claim} claim`);
  }
  return value;
}

function readText(row: object, key: string): string {
  const value: unknown = Reflect.get(row, key);
  if (typeof value !== 'string') {
    throw new Error(`Session row ${key} is not text`);
  }
  return value;
}

function readNullableText(row: object, key: string): string | null {
  const value: unknown = Reflect.get(row, key);
  if (value === null || typeof value === 'string') {
    return value;
  }
  throw new Error(`Session row ${key} is not text`);
}

function readBoolean(row: object, key: string): boolean {
  const value: unknown = Reflect.get(row, key);
  if (typeof value !== 'boolean') {
    throw new Error(`Session row ${key} is not a boolean`);
  }
  return value;
}

function readSessionList(body: unknown): SessionDto[] {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Session list body is not an object');
  }
  const rows: unknown = Reflect.get(body, 'rows');
  if (!Array.isArray(rows)) {
    throw new Error('Session list rows is not an array');
  }
  return rows.map((row) => {
    if (typeof row !== 'object' || row === null) {
      throw new Error('Session row is not an object');
    }
    expect(Object.keys(row).sort()).toEqual(SESSION_DTO_KEYS);
    const createdAt = readText(row, 'created_at');
    const lastSeenAt = readText(row, 'last_seen_at');
    expect(Number.isNaN(Date.parse(createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(lastSeenAt))).toBe(false);
    return {
      id_text: readText(row, 'id_text'),
      client_type: readText(row, 'client_type'),
      device_label: readNullableText(row, 'device_label'),
      created_at: createdAt,
      last_seen_at: lastSeenAt,
      is_current: readBoolean(row, 'is_current'),
    };
  });
}

describe('account session list and sign-out (real session store)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let authBase: string;
  let accountCounter = 0;

  beforeAll(async () => {
    const started = await startTestApp({ accountSessions: 'real' });
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for account session list integration test');
    }
    const apiBase = await getBaseApiUrl();
    authBase = `${apiBase}/auth`;
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  async function createVerifiedAccount(): Promise<TestAccount> {
    const { AccountService } = await import('@podverse/orm');
    accountCounter += 1;
    const email = `account-session-list-${Date.now()}-${accountCounter}@example.com`;
    const accountService = new AccountService();
    await accountService.create({
      email,
      password: TEST_PASSWORD,
      locale: 'en-US',
      terms_version: '2026-10-15',
    });
    const account = await accountService.getByEmail(email);
    if (!account) {
      throw new Error('Failed to load account after create');
    }
    await accountService.verifyEmail(account.id);
    return { id: account.id, email };
  }

  async function webLogin(
    account: TestAccount,
    userAgent: string
  ): Promise<{ token: string; sid: string }> {
    const res = await request(app)
      .post(`${authBase}/login`)
      .set('User-Agent', userAgent)
      .send({ email: account.email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    const token = jwtCookieValue(res);
    if (token === null || token === '') {
      throw new Error('Login set no jwt cookie');
    }
    return { token, sid: readClaim(token, 'sid') };
  }

  async function mobileLogin(
    account: TestAccount,
    deviceLabel: string
  ): Promise<{ accessToken: string; sid: string }> {
    const res = await request(app).post(`${authBase}/mobile/token`).send({
      email: account.email,
      password: TEST_PASSWORD,
      device_label: deviceLabel,
    });
    expect(res.status).toBe(200);
    const accessToken: unknown = res.body.access_token;
    if (typeof accessToken !== 'string') {
      throw new Error('Mobile token response is missing the access token');
    }
    return { accessToken, sid: readClaim(accessToken, 'sid') };
  }

  async function listSessions(cookie: string): Promise<SessionDto[]> {
    const res = await request(app).get(`${authBase}/sessions`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    const rows = readSessionList(res.body);
    let previousSeen = Number.POSITIVE_INFINITY;
    for (const row of rows) {
      const seen = Date.parse(row.last_seen_at);
      expect(seen).toBeLessThanOrEqual(previousSeen);
      previousSeen = seen;
    }
    return rows;
  }

  it('lists the account sessions, marks the caller, and omits every other field', async () => {
    const account = await createVerifiedAccount();
    const chrome = await webLogin(account, CHROME_MAC_USER_AGENT);
    const firefox = await webLogin(account, FIREFOX_WINDOWS_USER_AGENT);
    await mobileLogin(account, PHONE_LABEL);

    const rows = await listSessions(`jwt=${chrome.token}`);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.device_label).sort()).toEqual(
      [CHROME_MAC_LABEL, FIREFOX_WINDOWS_LABEL, PHONE_LABEL].sort()
    );
    expect(rows.find((row) => row.device_label === PHONE_LABEL)?.client_type).toBe('mobile');
    expect(rows.find((row) => row.device_label === CHROME_MAC_LABEL)?.client_type).toBe('web');
    expect(rows.find((row) => row.device_label === FIREFOX_WINDOWS_LABEL)?.client_type).toBe('web');

    const current = rows.filter((row) => row.is_current);
    expect(current).toHaveLength(1);
    expect(current[0]?.id_text).toBe(chrome.sid);
    expect(rows.find((row) => row.id_text === firefox.sid)?.is_current).toBe(false);
  });

  it('ends another session, then answers 404 for that id and for an invalid id', async () => {
    const account = await createVerifiedAccount();
    const chrome = await webLogin(account, CHROME_MAC_USER_AGENT);
    const firefox = await webLogin(account, FIREFOX_WINDOWS_USER_AGENT);
    await mobileLogin(account, PHONE_LABEL);

    const removed = await request(app)
      .delete(`${authBase}/sessions/${firefox.sid}`)
      .set('Cookie', `jwt=${chrome.token}`)
      .set(COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE);
    expect(removed.status).toBe(200);
    expect(removed.body).toEqual({ message: 'Session ended' });

    const ended = await request(app).get(`${authBase}/me`).set('Cookie', `jwt=${firefox.token}`);
    expect(ended.status).toBe(401);
    expect(ended.body).toEqual({
      message: 'Unauthorized',
      code: 'session_ended',
      notice: 'signed_out_elsewhere',
    });

    const rows = await listSessions(`jwt=${chrome.token}`);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.id_text)).not.toContain(firefox.sid);

    const again = await request(app)
      .delete(`${authBase}/sessions/${firefox.sid}`)
      .set('Cookie', `jwt=${chrome.token}`)
      .set(COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE);
    expect(again.status).toBe(404);
    expect(again.body).toEqual({ message: 'Session not found' });

    const invalid = await request(app)
      .delete(`${authBase}/sessions/not-a-valid-id`)
      .set('Cookie', `jwt=${chrome.token}`)
      .set(COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE);
    expect(invalid.status).toBe(404);
    expect(invalid.body).toEqual({ message: 'Session not found' });
  });

  it('refuses another account session id and leaves that session signed in', async () => {
    const owner = await createVerifiedAccount();
    const ownerSession = await webLogin(owner, CHROME_MAC_USER_AGENT);
    const other = await createVerifiedAccount();
    const otherSession = await webLogin(other, FIREFOX_WINDOWS_USER_AGENT);

    const denied = await request(app)
      .delete(`${authBase}/sessions/${otherSession.sid}`)
      .set('Cookie', `jwt=${ownerSession.token}`)
      .set(COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE);
    expect(denied.status).toBe(404);
    expect(denied.body).toEqual({ message: 'Session not found' });

    const still = await request(app)
      .get(`${authBase}/me`)
      .set('Cookie', `jwt=${otherSession.token}`);
    expect(still.status).toBe(200);
  });

  it('ending the current session clears the cookie and a replay is a plain 401', async () => {
    const account = await createVerifiedAccount();
    const session = await webLogin(account, CHROME_MAC_USER_AGENT);

    const removed = await request(app)
      .delete(`${authBase}/sessions/${session.sid}`)
      .set('Cookie', `jwt=${session.token}`)
      .set(COOKIE_WRITE_INTENT_HEADER, COOKIE_WRITE_INTENT_VALUE);
    expect(removed.status).toBe(200);
    expect(removed.body).toEqual({ message: 'Signed out' });
    expectJwtCookieCleared(removed);

    const replay = await request(app).get(`${authBase}/me`).set('Cookie', `jwt=${session.token}`);
    expect(replay.status).toBe(401);
    expect(replay.body).toEqual({ message: 'Unauthorized' });
  });

  it('ends every other session from a bearer token and leaves the caller signed in', async () => {
    const account = await createVerifiedAccount();
    const phone = await mobileLogin(account, PHONE_LABEL);
    const web = await webLogin(account, CHROME_MAC_USER_AGENT);

    const revoked = await request(app)
      .post(`${authBase}/sessions/revoke-others`)
      .set('Authorization', `Bearer ${phone.accessToken}`);
    expect(revoked.status).toBe(200);
    expect(revoked.body).toEqual({ revoked_count: 1 });

    const caller = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${phone.accessToken}`);
    expect(caller.status).toBe(200);

    const ended = await request(app).get(`${authBase}/me`).set('Cookie', `jwt=${web.token}`);
    expect(ended.status).toBe(401);
    expect(ended.body).toEqual({
      message: 'Unauthorized',
      code: 'session_ended',
      notice: 'signed_out_elsewhere',
    });
  });

  it('reports zero when the caller has no other session', async () => {
    const account = await createVerifiedAccount();
    const phone = await mobileLogin(account, PHONE_LABEL);

    const revoked = await request(app)
      .post(`${authBase}/sessions/revoke-others`)
      .set('Authorization', `Bearer ${phone.accessToken}`);
    expect(revoked.status).toBe(200);
    expect(revoked.body).toEqual({ revoked_count: 0 });

    const caller = await request(app)
      .get(`${authBase}/me`)
      .set('Authorization', `Bearer ${phone.accessToken}`);
    expect(caller.status).toBe(200);
  });

  it('rejects each session route when the request has no credentials', async () => {
    const list = await request(app).get(`${authBase}/sessions`);
    expect(list.status).toBe(401);
    expect(list.body).toEqual({ message: 'Unauthorized' });

    const revokeOthers = await request(app).post(`${authBase}/sessions/revoke-others`);
    expect(revokeOthers.status).toBe(401);
    expect(revokeOthers.body).toEqual({ message: 'Unauthorized' });

    const revoke = await request(app).delete(`${authBase}/sessions/not-a-valid-id`);
    expect(revoke.status).toBe(401);
    expect(revoke.body).toEqual({ message: 'Unauthorized' });
  });
});
