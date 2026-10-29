import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ApiKeyResource, CrudAction } from '@podverse/helpers';
import { apiKeyPermissionsForPreset, SharableStatusEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';
import { AccountService } from '@podverse/orm';

import {
  apiKeyHeaders,
  createApiKeyTestAccount,
  createTestApiKey,
  permissionsWithOnly,
  permissionsWithout,
} from './helpers/apiKeyTestAccounts.js';
import { getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

const providerMocks = vi.hoisted(() => ({
  resolveFeedsByGuid: vi.fn(async () => ({ status: 'not_found' })),
  resolveFeed: vi.fn(async () => ({ status: 'not_found' })),
  getFeedById: vi.fn(async () => ({ status: 'not_found' })),
  resolveItem: vi.fn(async () => ({ status: 'not_found' })),
}));

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

vi.mock('@api/factories/indexProvider.js', () => ({
  indexProvider: {
    id: 'podcast_index',
    resolveFeedsByGuid: providerMocks.resolveFeedsByGuid,
    resolveFeed: providerMocks.resolveFeed,
    getFeedById: providerMocks.getFeedById,
    resolveItem: providerMocks.resolveItem,
  },
}));

const EMAIL_PREFIX = 'api-key-routes-asa-';
const PLACEHOLDER_ID = 'pvtestid01';
const FEED_URL = 'https://example.com/feed.xml';

const NOT_ALLOWED_BODY = {
  message: 'API keys cannot be used for this endpoint.',
  code: 'api_key_not_allowed',
};

type Query = Record<string, string | number>;

type HttpMethod = 'get' | 'post' | 'put' | 'delete';

type RouteCase = {
  method: HttpMethod;
  path: string;
  resource: ApiKeyResource;
  action: CrudAction;
  query?: Query;
  body?: object;
};

const PAGE: Query = { page: 1 };
const PAGE_RANGE: Query = { page: 1, range: 'day' };
const MEDIUM_PAGE: Query = { medium: 'podcasts', page: 1 };
const MEDIUM_PAGE_RANGE: Query = { medium: 'podcasts', page: 1, range: 'day' };
const LIVE_RECENT: Query = { liveItemType: 'pending', medium: 'podcasts', page: 1 };
const LIVE_TOP: Query = { liveItemType: 'pending', medium: 'podcasts', page: 1, range: 'day' };

const PROFILE_BODY = {
  display_name: 'Denied Name',
  bio: null,
  sharable_status: SharableStatusEnum.Public,
  locale: 'en-US',
};

const CHANNEL_BODY = { channel_id_text: PLACEHOLDER_ID };
const CHANNELS_BODY = { channel_id_texts: [PLACEHOLDER_ID] };
const ACCOUNT_BODY = { following_account_id_text: PLACEHOLDER_ID };
const PLAYLIST_BODY = { playlist_id_text: PLACEHOLDER_ID };
const FEED_BODY = { feed_url: FEED_URL };
const MARK_SEEN_BODY = { entries: [{ channel_id_text: PLACEHOLDER_ID }] };
const MARK_ADD_BY_RSS_BODY = { entries: [{ feed_url: FEED_URL }] };
const OPML_BODY = { opml: '<opml version="2.0"></opml>' };
const PARSE_ALL_BODY = {};
const CHAPTERS_BODY = {
  itemIdText: PLACEHOLDER_ID,
  chaptersFeedUrl: 'https://example.com/chapters.json',
};
const REMOTE_ITEM_LOOKUP_BODY = {
  refs: [{ feed_guid: PLACEHOLDER_ID, feed_url: null, item_guid: null }],
};
const REMOTE_ITEM_RESOLVE_BODY = {
  feed_guid: PLACEHOLDER_ID,
  feed_url: null,
};
const ON_DEMAND_BODY = { url: FEED_URL, podcast_index_id: 1 };

function route(
  method: HttpMethod,
  path: string,
  resource: ApiKeyResource,
  action: CrudAction,
  input?: { query?: Query; body?: object }
): RouteCase {
  const routeCase: RouteCase = { method, path, resource, action };
  if (input?.query !== undefined) {
    routeCase.query = input.query;
  }
  if (input?.body !== undefined) {
    routeCase.body = input.body;
  }
  return routeCase;
}

const ROUTE_CASES: RouteCase[] = [
  route('put', '/account', 'account', 'update', { body: PROFILE_BODY }),
  route('get', `/account/${PLACEHOLDER_ID}`, 'account', 'read'),
  route('get', '/my-profile/podcasts/az', 'account', 'read', { query: PAGE }),
  route('get', '/my-profile/albums/az', 'account', 'read', { query: PAGE }),
  route('get', '/my-profile/playlists/az', 'account', 'read', { query: PAGE }),
  route('get', '/my-profile/clips/recent', 'account', 'read', { query: PAGE }),
  route('get', '/account/subscribed/az', 'subscriptions', 'read', { query: PAGE }),
  route('get', '/account/subscribed/recent', 'subscriptions', 'read', { query: PAGE }),
  route('get', '/account/subscribed/top', 'subscriptions', 'read', { query: PAGE_RANGE }),
  route('get', '/channel/subscribed/az', 'subscriptions', 'read', { query: MEDIUM_PAGE }),
  route('get', '/channel/subscribed/recent', 'subscriptions', 'read', { query: MEDIUM_PAGE }),
  route('get', '/channel/subscribed/top', 'subscriptions', 'read', { query: MEDIUM_PAGE_RANGE }),
  route('get', '/item/subscribed/recent', 'subscriptions', 'read', { query: MEDIUM_PAGE }),
  route('get', '/item/subscribed/top', 'subscriptions', 'read', { query: MEDIUM_PAGE_RANGE }),
  route('get', '/live-item/subscribed/recent', 'subscriptions', 'read', { query: LIVE_RECENT }),
  route('get', '/live-item/subscribed/top', 'subscriptions', 'read', { query: LIVE_TOP }),
  route('get', '/live-item/subscribed/upcoming', 'subscriptions', 'read', { query: MEDIUM_PAGE }),
  route('post', '/account/follow/channel', 'subscriptions', 'create', { body: CHANNEL_BODY }),
  route('post', '/account/follow/channel/bulk', 'subscriptions', 'create', {
    body: CHANNELS_BODY,
  }),
  route('post', '/account/unfollow/channel', 'subscriptions', 'delete', { body: CHANNEL_BODY }),
  route('post', '/account/unfollow/bulk', 'subscriptions', 'delete', { body: CHANNELS_BODY }),
  route('post', '/account/follow/account', 'subscriptions', 'create', { body: ACCOUNT_BODY }),
  route('post', '/account/unfollow/account', 'subscriptions', 'delete', { body: ACCOUNT_BODY }),
  route('post', '/account/follow/playlist', 'subscriptions', 'create', { body: PLAYLIST_BODY }),
  route('post', '/account/unfollow/playlist', 'subscriptions', 'delete', { body: PLAYLIST_BODY }),
  route('get', '/account/channel-seen', 'subscriptions', 'read', { query: PAGE }),
  route('get', '/account/channel-seen/add-by-rss', 'subscriptions', 'read', { query: PAGE }),
  route('post', '/account/channel-seen/mark', 'subscriptions', 'update', { body: MARK_SEEN_BODY }),
  route('post', '/account/channel-seen/mark-all', 'subscriptions', 'update'),
  route('post', '/account/channel-seen/mark-add-by-rss', 'subscriptions', 'update', {
    body: MARK_ADD_BY_RSS_BODY,
  }),
  route('get', '/account/opml/export', 'subscriptions', 'read'),
  route('post', '/account/opml/import', 'subscriptions', 'create', { body: OPML_BODY }),
  route('get', `/account/opml/import/status/${PLACEHOLDER_ID}`, 'subscriptions', 'read'),
  route('get', `/account/follow/add-by-rss-channel/${PLACEHOLDER_ID}`, 'add_by_rss', 'read'),
  route('post', '/account/follow/add-by-rss-channel', 'add_by_rss', 'create', { body: FEED_BODY }),
  route('post', '/account/unfollow/add-by-rss-channel', 'add_by_rss', 'delete', {
    body: FEED_BODY,
  }),
  route('post', '/account/add-by-rss/chapters-transcript', 'add_by_rss', 'read', {
    body: CHAPTERS_BODY,
  }),
  route('post', '/account/add-by-rss/remote-item/lookup', 'add_by_rss', 'read', {
    body: REMOTE_ITEM_LOOKUP_BODY,
  }),
  route('post', '/account/add-by-rss/remote-item/resolve', 'add_by_rss', 'read', {
    body: REMOTE_ITEM_RESOLVE_BODY,
  }),
  route('post', '/account/add-by-rss/parse', 'add_by_rss', 'create', { body: FEED_BODY }),
  route('post', '/account/add-by-rss/parse/all', 'add_by_rss', 'create', { body: PARSE_ALL_BODY }),
  route('get', `/account/add-by-rss/parse/status/${PLACEHOLDER_ID}`, 'add_by_rss', 'read'),
  route('post', '/mq/rss/add/on-demand', 'add_by_rss', 'create', { body: ON_DEMAND_BODY }),
  route('post', '/mq/rss/refresh/on-demand', 'add_by_rss', 'create', { body: ON_DEMAND_BODY }),
];

function requirementKey(resource: ApiKeyResource, action: CrudAction): string {
  return `${resource}:${action}`;
}

function distinctRequirements(
  cases: RouteCase[]
): Array<{ resource: ApiKeyResource; action: CrudAction }> {
  const seen = new Set<string>();
  const requirements: Array<{ resource: ApiKeyResource; action: CrudAction }> = [];
  for (const routeCase of cases) {
    const key = requirementKey(routeCase.resource, routeCase.action);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    requirements.push({ resource: routeCase.resource, action: routeCase.action });
  }
  return requirements;
}

function requireIdText(account: { id_text: string } | null): string {
  if (account === null || account.id_text === '') {
    throw new Error('Account id_text missing');
  }
  return account.id_text;
}

function listedIdTexts(body: unknown): string[] {
  if (body === null || typeof body !== 'object' || !('data' in body)) {
    return [];
  }
  const data = body.data;
  if (!Array.isArray(data)) {
    return [];
  }
  const ids: string[] = [];
  for (const row of data) {
    if (
      row !== null &&
      typeof row === 'object' &&
      'id_text' in row &&
      typeof row.id_text === 'string'
    ) {
      ids.push(row.id_text);
    }
  }
  return ids;
}

function readDisplayName(body: unknown): string | undefined {
  if (body === null || typeof body !== 'object' || !('account_profile' in body)) {
    return undefined;
  }
  const profile = body.account_profile;
  if (profile === null || typeof profile !== 'object' || !('display_name' in profile)) {
    return undefined;
  }
  const name = profile.display_name;
  return typeof name === 'string' ? name : undefined;
}

describe('API key access for account, subscriptions, and Add by RSS', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let apiBase: string;
  let ownerIdText: string;
  let targetIdText: string;
  let accountWriteToken: string;
  let subscriptionsWriteToken: string;
  let subscriptionsReadToken: string;
  let addByRssReadToken: string;
  let fullAccessToken: string;
  const deniedTokens = new Map<string, string>();

  beforeAll(async () => {
    const started = await startTestApp({ accountSessions: 'real' });
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for API key route access integration test');
    }
    apiBase = await getBaseApiUrl();

    const accountService = new AccountService();
    const owner = await createApiKeyTestAccount(EMAIL_PREFIX);
    ownerIdText = requireIdText(await accountService.get(owner.id));

    for (const requirement of distinctRequirements(ROUTE_CASES)) {
      const token = await createTestApiKey(owner.id, permissionsWithout(requirement));
      deniedTokens.set(requirementKey(requirement.resource, requirement.action), token);
    }

    accountWriteToken = await createTestApiKey(
      owner.id,
      permissionsWithOnly([
        { resource: 'account', action: 'read' },
        { resource: 'account', action: 'update' },
      ])
    );
    subscriptionsWriteToken = await createTestApiKey(
      owner.id,
      permissionsWithOnly([
        { resource: 'subscriptions', action: 'create' },
        { resource: 'subscriptions', action: 'read' },
        { resource: 'subscriptions', action: 'delete' },
      ])
    );
    subscriptionsReadToken = await createTestApiKey(
      owner.id,
      permissionsWithOnly([{ resource: 'subscriptions', action: 'read' }])
    );
    addByRssReadToken = await createTestApiKey(
      owner.id,
      permissionsWithOnly([{ resource: 'add_by_rss', action: 'read' }])
    );

    const closedAccount = await createApiKeyTestAccount(EMAIL_PREFIX);
    fullAccessToken = await createTestApiKey(
      closedAccount.id,
      apiKeyPermissionsForPreset('full_access')
    );

    const target = await createApiKeyTestAccount(EMAIL_PREFIX);
    // Subscribed lists omit a private profile and a profile with no display name.
    const updatedTarget = await accountService.update(target.id, {
      display_name: 'Follow Target',
      bio: null,
      sharable_status: SharableStatusEnum.Public,
      locale: 'en-US',
    });
    targetIdText = requireIdText(updatedTarget);
  }, 60000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  function deniedToken(resource: ApiKeyResource, action: CrudAction): string {
    const token = deniedTokens.get(requirementKey(resource, action));
    if (token === undefined) {
      throw new Error(`No key for ${resource} ${action}`);
    }
    return token;
  }

  function callRoute(routeCase: RouteCase, token: string): request.Test {
    const url = `${apiBase}${routeCase.path}`;
    const headers = apiKeyHeaders(token);
    let pending: request.Test;
    if (routeCase.method === 'get') {
      pending = request(app).get(url).set(headers);
    } else if (routeCase.method === 'post') {
      pending = request(app).post(url).set(headers);
    } else if (routeCase.method === 'put') {
      pending = request(app).put(url).set(headers);
    } else {
      pending = request(app).delete(url).set(headers);
    }
    if (routeCase.query !== undefined) {
      pending = pending.query(routeCase.query);
    }
    if (routeCase.body !== undefined) {
      pending = pending.send(routeCase.body);
    }
    return pending;
  }

  it('covers every labeled account, subscription, and Add by RSS route', () => {
    expect(ROUTE_CASES).toHaveLength(44);
    expect(ROUTE_CASES.filter((routeCase) => routeCase.resource === 'account')).toHaveLength(6);
    expect(ROUTE_CASES.filter((routeCase) => routeCase.resource === 'subscriptions')).toHaveLength(
      27
    );
    expect(ROUTE_CASES.filter((routeCase) => routeCase.resource === 'add_by_rss')).toHaveLength(
      11
    );
    expect(distinctRequirements(ROUTE_CASES)).toHaveLength(9);
  });

  it.each(ROUTE_CASES)(
    '$method $path refuses a key missing $action on $resource',
    async (routeCase) => {
      const res = await callRoute(routeCase, deniedToken(routeCase.resource, routeCase.action));
      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        message: `This API key needs the ${routeCase.action} permission on ${routeCase.resource}.`,
        code: 'api_key_permission_denied',
        required_permission: { resource: routeCase.resource, action: routeCase.action },
      });
    }
  );

  it('a key with account read and update changes the profile shown by GET /auth/me', async () => {
    const displayName = 'Key Updated Name';
    const updated = await request(app)
      .put(`${apiBase}/account`)
      .set(apiKeyHeaders(accountWriteToken))
      .send({
        display_name: displayName,
        bio: 'Updated by key',
        sharable_status: SharableStatusEnum.Public,
        locale: 'en-US',
      });
    expect(updated.status).toBe(200);

    const me = await request(app).get(`${apiBase}/auth/me`).set(apiKeyHeaders(accountWriteToken));
    expect(me.status).toBe(200);
    expect(readDisplayName(me.body)).toBe(displayName);
  });

  it('a key with subscriptions create, read, and delete follows an account, lists it, then unfollows it', async () => {
    const headers = apiKeyHeaders(subscriptionsWriteToken);
    const follow = await request(app)
      .post(`${apiBase}/account/follow/account`)
      .set(headers)
      .send({ following_account_id_text: targetIdText });
    expect(follow.status).toBe(201);

    const listed = await request(app)
      .get(`${apiBase}/account/subscribed/az`)
      .query({ page: 1 })
      .set(headers);
    expect(listed.status).toBe(200);
    expect(listedIdTexts(listed.body)).toContain(targetIdText);

    const unfollow = await request(app)
      .post(`${apiBase}/account/unfollow/account`)
      .set(headers)
      .send({ following_account_id_text: targetIdText });
    expect(unfollow.status).toBe(204);

    const listedAfter = await request(app)
      .get(`${apiBase}/account/subscribed/az`)
      .query({ page: 1 })
      .set(headers);
    expect(listedAfter.status).toBe(200);
    expect(listedIdTexts(listedAfter.body)).not.toContain(targetIdText);
  });

  it('a key with only subscriptions read gets channel seen state and an OPML export', async () => {
    const headers = apiKeyHeaders(subscriptionsReadToken);
    const seen = await request(app)
      .get(`${apiBase}/account/channel-seen`)
      .query({ page: 1 })
      .set(headers);
    expect(seen.status).toBe(200);

    const opml = await request(app).get(`${apiBase}/account/opml/export`).set(headers);
    expect(opml.status).toBe(200);
  });

  it('a key with only add_by_rss read gets the account Add by RSS follows', async () => {
    const followed = await request(app)
      .get(`${apiBase}/account/follow/add-by-rss-channel/${ownerIdText}`)
      .set(apiKeyHeaders(addByRssReadToken));
    expect(followed.status).toBe(200);
  });

  it('a full-access key is still refused on password change and account deletion', async () => {
    const headers = apiKeyHeaders(fullAccessToken);
    const password = await request(app).post(`${apiBase}/account/change-password`).set(headers);
    expect(password.status).toBe(403);
    expect(password.body).toEqual(NOT_ALLOWED_BODY);

    const deleted = await request(app).delete(`${apiBase}/account/delete`).set(headers);
    expect(deleted.status).toBe(403);
    expect(deleted.body).toEqual(NOT_ALLOWED_BODY);
  });
});
