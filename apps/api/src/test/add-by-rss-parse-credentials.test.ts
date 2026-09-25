import { randomUUID } from 'node:crypto';

import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountMembershipEnum } from '@podverse/helpers';
import { openAddByRssCredentials } from '@podverse/helpers-backend';
import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  TEST_USER_ACCOUNT_ID_TEXT,
} from './helpers/index.js';

const TEST_USER_ID = 1;
const USERNAME = 'feed-user';
const PASSWORD = 'correct horse battery staple';
// Per-run nonce keeps feed URLs clear of add-by-RSS parse dedupe entries left by earlier runs.
const RUN_NONCE = randomUUID();

type MqAddByRSSOptions = {
  accountId: number;
  feedUrl: string;
  requestId: string;
  credentialsEnvelope?: string;
};

type ResourceRequestConfig = {
  headers?: Record<string, string>;
  beforeRedirect?: unknown;
};

const { getAccountMock, getFollowedAddByRSSChannelsMock, mqAddByRSSAddMock, resourceRequestMock } =
  vi.hoisted(() => {
    const premiumAccount = () => ({
      id: 1,
      id_text: TEST_USER_ACCOUNT_ID_TEXT,
      account_credentials: { email: 'add-by-rss-credentials@example.com' },
      account_membership_status: {
        membership_expires_at: new Date(Date.now() + 86400000 * 365),
        account_membership: { id: AccountMembershipEnum.Premium },
      },
      sharable_status: { id: 1 },
    });
    return {
      getAccountMock: vi.fn(async () => premiumAccount()),
      getFollowedAddByRSSChannelsMock: vi.fn(
        async (): Promise<Array<{ feed_url: string; requires_credentials?: boolean }>> => []
      ),
      mqAddByRSSAddMock: vi.fn(async (_service: unknown, _options: MqAddByRSSOptions) => {}),
      resourceRequestMock: vi.fn(async (url: string, _config?: ResourceRequestConfig) =>
        url.includes('chapters')
          ? { status: 200, data: { chapters: [] } }
          : { status: 200, data: 'WEBVTT' }
      ),
    };
  });

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();
  return {
    ...actual,
    AccountService: class {
      get = getAccountMock;
      getByIdText = getAccountMock;
    },
    AccountFollowingAddByRSSChannelService: class {
      getFollowedAddByRSSChannels = getFollowedAddByRSSChannelsMock;
    },
  };
});

vi.mock('@podverse/mq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/mq')>();
  return {
    ...actual,
    mqAddByRSSAdd: mqAddByRSSAddMock,
  };
});

vi.mock('@api/lib/_request.js', () => ({
  _request: resourceRequestMock,
}));

const transitKey = (): string => {
  const key = process.env.ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY;
  if (key === undefined || key === '') {
    throw new Error('ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY must be set for this test');
  }
  return key;
};

const lastMqOptions = (): MqAddByRSSOptions => {
  const call = mqAddByRSSAddMock.mock.calls.at(-1);
  if (!call) {
    throw new Error('Expected mqAddByRSSAdd to be called');
  }
  return call[1];
};

const openEnvelope = (options: MqAddByRSSOptions) => {
  expect(options.credentialsEnvelope?.startsWith('t1:')).toBe(true);
  return openAddByRssCredentials(options.credentialsEnvelope ?? '', transitKey(), {
    accountId: options.accountId,
    requestId: options.requestId,
    feedUrl: options.feedUrl,
  });
};

describe('Add-by-RSS parse credentials in transit', () => {
  let app: import('express').Express;
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let accountBase = '';
  let previousFixturesEnv: string | undefined;

  const feedUrl = (name: string) => `https://feeds.example.com/${name}-${RUN_NONCE}.xml`;

  beforeAll(async () => {
    previousFixturesEnv = process.env.PODVERSE_E2E_FIXTURES;
    delete process.env.PODVERSE_E2E_FIXTURES;
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    accountBase = `${await getBaseApiUrl()}/account`;
  });

  afterAll(async () => {
    if (previousFixturesEnv !== undefined) {
      process.env.PODVERSE_E2E_FIXTURES = previousFixturesEnv;
    }
    await stopTestApp(server, ormContext);
  });

  beforeEach(async () => {
    const { addByRssParseEnqueueRateLimit } =
      await import('../controllers/account/accountAddByRSSParse.js');
    addByRssParseEnqueueRateLimit.resetForUser(TEST_USER_ID);
    getAccountMock.mockClear();
    getFollowedAddByRSSChannelsMock.mockReset();
    mqAddByRSSAddMock.mockClear();
    resourceRequestMock.mockClear();
  });

  it('seals body credentials into the queue message and never stores them', async () => {
    const url = feedUrl('body-creds');
    const res = await request(app)
      .post(`${accountBase}/add-by-rss/parse`)
      .set(authHeaders(TEST_USER_ID))
      .send({ feed_url: url, basic_auth_username: USERNAME, basic_auth_password: PASSWORD });

    expect(res.status).toBe(201);
    const options = lastMqOptions();
    expect(options.feedUrl).toBe(url);
    expect(options.requestId).toBe(res.body.request_id);
    expect(openEnvelope(options)).toEqual({ username: USERNAME, password: PASSWORD });
    expect(JSON.stringify(options)).not.toContain(PASSWORD);

    const status = await request(app)
      .get(`${accountBase}/add-by-rss/parse/status/${res.body.request_id}`)
      .set(authHeaders(TEST_USER_ID));
    expect(status.status).toBe(200);
    expect(status.body.status).toBe('queued');
    expect(JSON.stringify(status.body)).not.toContain(PASSWORD);
    expect(JSON.stringify(status.body)).not.toContain(USERNAME);
  });

  it('splits userinfo off feed_url and uses it as the credentials', async () => {
    const url = feedUrl('userinfo');
    const userinfo = `${USERNAME}:${encodeURIComponent(PASSWORD)}`;
    const withUserinfo = url.replace('https://', `https://${userinfo}@`);
    const res = await request(app)
      .post(`${accountBase}/add-by-rss/parse`)
      .set(authHeaders(TEST_USER_ID))
      .send({ feed_url: withUserinfo });

    expect(res.status).toBe(201);
    const options = lastMqOptions();
    expect(options.feedUrl).toBe(url);
    expect(openEnvelope(options)).toEqual({ username: USERNAME, password: PASSWORD });

    const status = await request(app)
      .get(`${accountBase}/add-by-rss/parse/status/${res.body.request_id}`)
      .set(authHeaders(TEST_USER_ID));
    expect(status.body.feedUrl).toBe(url);
  });

  it('accepts a second parse that carries credentials inside the duplicate window', async () => {
    const url = feedUrl('credential-recheck');
    const send = () =>
      request(app)
        .post(`${accountBase}/add-by-rss/parse`)
        .set(authHeaders(TEST_USER_ID))
        .send({ feed_url: url, basic_auth_username: USERNAME, basic_auth_password: PASSWORD });

    const first = await send();
    expect(first.status).toBe(201);

    const second = await send();
    expect(second.status).toBe(201);
    expect(second.body.request_id).not.toBe(first.body.request_id);
  });

  it('rejects a second public parse inside the duplicate window', async () => {
    const url = feedUrl('public-duplicate');
    const send = () =>
      request(app)
        .post(`${accountBase}/add-by-rss/parse`)
        .set(authHeaders(TEST_USER_ID))
        .send({ feed_url: url });

    const first = await send();
    expect(first.status).toBe(201);

    const second = await send();
    expect(second.status).toBe(429);
  });

  it('sends no envelope for a public feed', async () => {
    const res = await request(app)
      .post(`${accountBase}/add-by-rss/parse`)
      .set(authHeaders(TEST_USER_ID))
      .send({ feed_url: feedUrl('public') });

    expect(res.status).toBe(201);
    expect(lastMqOptions().credentialsEnvelope).toBeUndefined();
  });

  it('rejects half a credential pair or an oversized value without echoing it', async () => {
    const halfPair = await request(app)
      .post(`${accountBase}/add-by-rss/parse`)
      .set(authHeaders(TEST_USER_ID))
      .send({ feed_url: feedUrl('half-pair'), basic_auth_password: PASSWORD });
    expect(halfPair.status).toBe(400);
    expect(JSON.stringify(halfPair.body)).not.toContain(PASSWORD);

    const oversized = 'x'.repeat(256);
    const tooLong = await request(app)
      .post(`${accountBase}/add-by-rss/parse`)
      .set(authHeaders(TEST_USER_ID))
      .send({
        feed_url: feedUrl('too-long'),
        basic_auth_username: USERNAME,
        basic_auth_password: oversized,
      });
    expect(tooLong.status).toBe(400);
    expect(JSON.stringify(tooLong.body)).not.toContain(oversized);
    expect(mqAddByRSSAddMock).not.toHaveBeenCalled();
  });

  it('parse/all skips flagged feeds without credentials and seals the rest', async () => {
    const flaggedMissing = feedUrl('all-flagged-missing');
    const flaggedProvided = feedUrl('all-flagged-provided');
    const publicFeed = feedUrl('all-public');
    getFollowedAddByRSSChannelsMock.mockResolvedValue([
      { feed_url: flaggedMissing, requires_credentials: true },
      { feed_url: flaggedProvided, requires_credentials: true },
      { feed_url: publicFeed, requires_credentials: false },
    ]);

    const res = await request(app)
      .post(`${accountBase}/add-by-rss/parse/all`)
      .set(authHeaders(TEST_USER_ID))
      .send({
        credentials_by_url: { [flaggedProvided]: { username: USERNAME, password: PASSWORD } },
      });

    expect(res.status).toBe(201);
    expect(res.body.request_ids).toHaveLength(3);

    const queuedUrls = mqAddByRSSAddMock.mock.calls.map(([, options]) => options.feedUrl);
    expect(queuedUrls).toEqual([flaggedProvided, publicFeed]);
    const [providedCall, publicCall] = mqAddByRSSAddMock.mock.calls;
    expect(providedCall && openEnvelope(providedCall[1])).toEqual({
      username: USERNAME,
      password: PASSWORD,
    });
    expect(publicCall?.[1].credentialsEnvelope).toBeUndefined();

    const missingRequest = res.body.request_ids.find(
      (entry: { feed_url: string }) => entry.feed_url === flaggedMissing
    );
    const status = await request(app)
      .get(`${accountBase}/add-by-rss/parse/status/${missingRequest.request_id}`)
      .set(authHeaders(TEST_USER_ID));
    expect(status.body).toMatchObject({
      status: 'failed',
      failureReason: 'credentials_required',
      credentialsState: 'not_provided',
    });
  });

  it('chapters-transcript attaches credentials only within the feed registrable domain', async () => {
    const res = await request(app)
      .post(`${accountBase}/add-by-rss/chapters-transcript`)
      .set(authHeaders(TEST_USER_ID))
      .send({
        itemIdText: 'item-1',
        feedUrl: feedUrl('chapters'),
        chaptersFeedUrl: 'https://cdn.example.com/chapters.json',
        transcriptUrl: 'https://transcripts.other-host.net/episode.vtt',
        basic_auth_username: USERNAME,
        basic_auth_password: PASSWORD,
      });

    expect(res.status).toBe(200);
    const configFor = (url: string) =>
      resourceRequestMock.mock.calls.find(([calledUrl]) => calledUrl === url)?.[1];
    expect(configFor('https://cdn.example.com/chapters.json')?.headers?.Authorization).toBe(
      `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`, 'utf8').toString('base64')}`
    );
    expect(
      configFor('https://transcripts.other-host.net/episode.vtt')?.headers?.Authorization
    ).toBeUndefined();
  });

  it('chapters-transcript requires feedUrl when credentials are sent', async () => {
    const res = await request(app)
      .post(`${accountBase}/add-by-rss/chapters-transcript`)
      .set(authHeaders(TEST_USER_ID))
      .send({
        itemIdText: 'item-1',
        chaptersFeedUrl: 'https://cdn.example.com/chapters.json',
        basic_auth_username: USERNAME,
        basic_auth_password: PASSWORD,
      });

    expect(res.status).toBe(400);
    expect(resourceRequestMock).not.toHaveBeenCalled();
  });
});
