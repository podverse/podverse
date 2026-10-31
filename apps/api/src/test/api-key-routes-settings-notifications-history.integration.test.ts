import type { Express } from 'express';
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ApiKeyPermissionRequirement } from '@podverse/helpers';
import { apiKeyPermissionsForPreset } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  apiKeyHeaders,
  createApiKeyTestAccount,
  createTestApiKey,
  permissionsWithOnly,
  permissionsWithout,
} from './helpers/apiKeyTestAccounts.js';
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

/** Differs from the `en-US` locale stored when the test account is created. */
const UPDATED_LOCALE = 'es';
const CHANNEL_ID = 'pvtestid01';
const NOTIFICATION_TYPE = 'new-item';
const PREFERENCE_CATEGORY = 'product-update';

const LOCALE_BODY: Record<string, unknown> = { locale: UPDATED_LOCALE };
const PLAYBACK_BODY: Record<string, unknown> = { preferred_media_type: 'audio' };
const NOTIFICATION_SETTINGS_BODY: Record<string, unknown> = { auto_enable_on_subscribe: true };
const NOTIFICATION_TYPE_BODY: Record<string, unknown> = { type: NOTIFICATION_TYPE };
const MARK_READ_BY_ITEM_BODY: Record<string, unknown> = {
  item_id_text: CHANNEL_ID,
  type: NOTIFICATION_TYPE,
};
const PREFERENCE_BODY: Record<string, unknown> = {
  preferences: [
    {
      category: PREFERENCE_CATEGORY,
      in_app_enabled: false,
      push_enabled: false,
    },
  ],
};
const HIDE_BODY: Record<string, unknown> = { channel_id_text: CHANNEL_ID };
const UNHIDE_BODY: Record<string, unknown> = {
  channel_id_text: CHANNEL_ID,
  add_to_taste_profile: false,
};
const LISTEN_STATS_BODY: Record<string, unknown> = { accepted: true };

const NOT_ALLOWED_BODY = {
  message: 'API keys cannot be used for this endpoint.',
  code: 'api_key_not_allowed',
};

const settingsUpdate: ApiKeyPermissionRequirement = { resource: 'settings', action: 'update' };
const notificationsRead: ApiKeyPermissionRequirement = {
  resource: 'notifications',
  action: 'read',
};
const notificationsCreate: ApiKeyPermissionRequirement = {
  resource: 'notifications',
  action: 'create',
};
const notificationsUpdate: ApiKeyPermissionRequirement = {
  resource: 'notifications',
  action: 'update',
};
const notificationsDelete: ApiKeyPermissionRequirement = {
  resource: 'notifications',
  action: 'delete',
};
const historyRead: ApiKeyPermissionRequirement = { resource: 'history', action: 'read' };
const historyUpdate: ApiKeyPermissionRequirement = { resource: 'history', action: 'update' };

type RouteMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';

type RouteCase = {
  method: RouteMethod;
  path: string;
  requirement: ApiKeyPermissionRequirement;
  body?: Record<string, unknown>;
};

const settingsRoutes: RouteCase[] = [
  {
    method: 'patch',
    path: '/account-settings/locale',
    requirement: settingsUpdate,
    body: LOCALE_BODY,
  },
  {
    method: 'patch',
    path: '/account-settings/playback',
    requirement: settingsUpdate,
    body: PLAYBACK_BODY,
  },
  {
    method: 'patch',
    path: '/account-settings/notification',
    requirement: settingsUpdate,
    body: NOTIFICATION_SETTINGS_BODY,
  },
  {
    method: 'post',
    path: '/account-settings/notification-type',
    requirement: settingsUpdate,
    body: NOTIFICATION_TYPE_BODY,
  },
  {
    method: 'delete',
    path: '/account-settings/notification-type',
    requirement: settingsUpdate,
    body: NOTIFICATION_TYPE_BODY,
  },
  { method: 'put', path: '/account/auto-download/channels', requirement: settingsUpdate },
];

const historyRoutes: RouteCase[] = [
  { method: 'get', path: '/account/content-log', requirement: historyRead },
  { method: 'get', path: '/account/taste-profile', requirement: historyRead },
  { method: 'get', path: '/account/taste-profile/hidden', requirement: historyRead },
  {
    method: 'post',
    path: '/account/taste-profile/hide',
    requirement: historyUpdate,
    body: HIDE_BODY,
  },
  {
    method: 'post',
    path: '/account/taste-profile/unhide',
    requirement: historyUpdate,
    body: UNHIDE_BODY,
  },
  { method: 'get', path: '/account/recommendations', requirement: historyRead },
  { method: 'get', path: '/account/channel-hidden', requirement: historyRead },
  {
    method: 'post',
    path: '/account/channel-hidden/hide',
    requirement: historyUpdate,
    body: HIDE_BODY,
  },
  {
    method: 'post',
    path: '/account/channel-hidden/unhide',
    requirement: historyUpdate,
    body: HIDE_BODY,
  },
  {
    method: 'post',
    path: '/account/taste-profile/weight',
    requirement: historyUpdate,
    body: { channel_id_text: CHANNEL_ID, weight: 3 },
  },
];

const notificationRoutes: RouteCase[] = [
  { method: 'get', path: '/account/notifications', requirement: notificationsRead },
  { method: 'get', path: '/account/notifications/unread-count', requirement: notificationsRead },
  { method: 'post', path: '/account/notifications/mark-read', requirement: notificationsUpdate },
  {
    method: 'post',
    path: '/account/notifications/mark-read-by-item',
    requirement: notificationsUpdate,
    body: MARK_READ_BY_ITEM_BODY,
  },
  {
    method: 'post',
    path: '/account/notifications/1/mark-read',
    requirement: notificationsUpdate,
  },
  { method: 'get', path: '/account/notification-preferences', requirement: notificationsRead },
  {
    method: 'put',
    path: '/account/notification-preferences',
    requirement: notificationsUpdate,
    body: PREFERENCE_BODY,
  },
  { method: 'get', path: '/account/events', requirement: notificationsRead },
  {
    method: 'get',
    path: `/account/notification/channel/${CHANNEL_ID}`,
    requirement: notificationsRead,
  },
  { method: 'get', path: '/account/notification/channels', requirement: notificationsRead },
  { method: 'post', path: '/account/notification/channel', requirement: notificationsCreate },
  {
    method: 'delete',
    path: `/account/notification/channel/${CHANNEL_ID}`,
    requirement: notificationsDelete,
  },
  {
    method: 'post',
    path: '/account/notification/channels/bulk-enable',
    requirement: notificationsUpdate,
  },
  {
    method: 'post',
    path: '/account/notification/channels/bulk-disable',
    requirement: notificationsUpdate,
  },
  { method: 'post', path: '/account/notification/channel/type', requirement: notificationsCreate },
  {
    method: 'post',
    path: '/account/notification/channels/bulk-type',
    requirement: notificationsUpdate,
  },
  {
    method: 'delete',
    path: `/account/notification/channel/${CHANNEL_ID}/type/${NOTIFICATION_TYPE}`,
    requirement: notificationsDelete,
  },
  { method: 'post', path: '/account/fcm-device/create', requirement: notificationsCreate },
  { method: 'put', path: '/account/fcm-device/update', requirement: notificationsUpdate },
  { method: 'delete', path: '/account/fcm-device/delete', requirement: notificationsDelete },
  { method: 'get', path: '/account/fcm-device/all-for-account', requirement: notificationsRead },
  { method: 'put', path: '/account/fcm-device/update-locale', requirement: notificationsUpdate },
  { method: 'post', path: '/account/webpush-device/create', requirement: notificationsCreate },
  { method: 'put', path: '/account/webpush-device/update', requirement: notificationsUpdate },
  { method: 'delete', path: '/account/webpush-device/delete', requirement: notificationsDelete },
  {
    method: 'get',
    path: '/account/webpush-device/all-for-account',
    requirement: notificationsRead,
  },
  {
    method: 'put',
    path: '/account/webpush-device/update-locale',
    requirement: notificationsUpdate,
  },
  { method: 'post', path: '/account/up-device/create', requirement: notificationsCreate },
  { method: 'put', path: '/account/up-device/update', requirement: notificationsUpdate },
  { method: 'delete', path: '/account/up-device/delete', requirement: notificationsDelete },
  { method: 'get', path: '/account/up-device/for-account', requirement: notificationsRead },
  { method: 'put', path: '/account/up-device/update-locale', requirement: notificationsUpdate },
  { method: 'delete', path: '/account/up-device/delete-all', requirement: notificationsDelete },
];

const LABELED_ROUTES: RouteCase[] = [...settingsRoutes, ...historyRoutes, ...notificationRoutes];

function requirementKey(requirement: ApiKeyPermissionRequirement): string {
  return `${requirement.resource}:${requirement.action}`;
}

function permissionDeniedBody(requirement: ApiKeyPermissionRequirement) {
  return {
    message: `This API key needs the ${requirement.action} permission on ${requirement.resource}.`,
    code: 'api_key_permission_denied',
    required_permission: requirement,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function headerIncludesJson(header: unknown): boolean {
  if (typeof header === 'string') {
    return header.includes('application/json');
  }
  if (Array.isArray(header)) {
    return header.some((value) => typeof value === 'string' && value.includes('application/json'));
  }
  return false;
}

function responseLocale(body: unknown): string {
  if (!isRecord(body) || !isRecord(body.data) || typeof body.data.locale !== 'string') {
    throw new Error('Locale response is missing data.locale');
  }
  return body.data.locale;
}

function preferencesIncludePushDisabled(body: unknown): boolean {
  if (!isRecord(body) || !Array.isArray(body.data)) {
    return false;
  }
  return body.data.some(
    (row) => isRecord(row) && row.category === PREFERENCE_CATEGORY && row.push_enabled === false
  );
}

describe('API key access on settings, notification, and history routes', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: Express;
  let apiBase: string;
  let deniedTokens = new Map<string, string>();
  let settingsUpdateToken = '';
  let notificationsReadToken = '';
  let notificationsReadUpdateToken = '';
  let historyReadToken = '';
  let fullAccessToken = '';

  beforeAll(async () => {
    const started = await startTestApp({ accountSessions: 'real' });
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error(
        'ORM context required for settings, notification, and history API key route test'
      );
    }
    apiBase = await getBaseApiUrl();
    const account = await createApiKeyTestAccount('api-key-routes-snh-');

    deniedTokens = new Map();
    for (const route of LABELED_ROUTES) {
      const key = requirementKey(route.requirement);
      if (deniedTokens.has(key)) {
        continue;
      }
      deniedTokens.set(
        key,
        await createTestApiKey(account.id, permissionsWithout(route.requirement))
      );
    }
    settingsUpdateToken = await createTestApiKey(account.id, permissionsWithOnly([settingsUpdate]));
    notificationsReadToken = await createTestApiKey(
      account.id,
      permissionsWithOnly([notificationsRead])
    );
    notificationsReadUpdateToken = await createTestApiKey(
      account.id,
      permissionsWithOnly([notificationsRead, notificationsUpdate])
    );
    historyReadToken = await createTestApiKey(account.id, permissionsWithOnly([historyRead]));
    fullAccessToken = await createTestApiKey(account.id, apiKeyPermissionsForPreset('full_access'));
  }, 60000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  function deniedToken(requirement: ApiKeyPermissionRequirement): string {
    const token = deniedTokens.get(requirementKey(requirement));
    if (token === undefined) {
      throw new Error(`No key for ${requirementKey(requirement)}`);
    }
    return token;
  }

  function callRoute(route: RouteCase, token: string) {
    const url = `${apiBase}${route.path}`;
    const headers = apiKeyHeaders(token);
    let pending = request(app).get(url);
    if (route.method === 'post') {
      pending = request(app).post(url);
    } else if (route.method === 'patch') {
      pending = request(app).patch(url);
    } else if (route.method === 'put') {
      pending = request(app).put(url);
    } else if (route.method === 'delete') {
      pending = request(app).delete(url);
    }
    pending = pending.set(headers);
    if (route.body !== undefined) {
      pending = pending.send(route.body);
    }
    return pending;
  }

  it('labels every settings, notification, and history route', () => {
    expect(settingsRoutes).toHaveLength(6);
    expect(notificationRoutes).toHaveLength(33);
    expect(historyRoutes).toHaveLength(7);
    expect(LABELED_ROUTES).toHaveLength(46);
    expect(deniedTokens.size).toBe(7);
    const identities = LABELED_ROUTES.map((route) => `${route.method} ${route.path}`);
    expect(new Set(identities).size).toBe(LABELED_ROUTES.length);
  });

  it.each(LABELED_ROUTES)('$method $path denies a key missing that permission', async (route) => {
    const res = await callRoute(route, deniedToken(route.requirement));
    expect(res.status).toBe(403);
    expect(res.body).toEqual(permissionDeniedBody(route.requirement));
    if (route.path === '/account/events') {
      expect(headerIncludesJson(res.headers['content-type'])).toBe(true);
    }
  });

  it('a settings update key can change the account locale', async () => {
    const res = await request(app)
      .patch(`${apiBase}/account-settings/locale`)
      .set(apiKeyHeaders(settingsUpdateToken))
      .send(LOCALE_BODY);
    expect(res.status).toBe(200);
    expect(responseLocale(res.body)).toBe(UPDATED_LOCALE);
  });

  it('a notifications read key can list the inbox and preferences', async () => {
    const inbox = await request(app)
      .get(`${apiBase}/account/notifications`)
      .set(apiKeyHeaders(notificationsReadToken));
    expect(inbox.status).toBe(200);

    const preferences = await request(app)
      .get(`${apiBase}/account/notification-preferences`)
      .set(apiKeyHeaders(notificationsReadToken));
    expect(preferences.status).toBe(200);
  });

  it('a notifications read and update key can turn push off for one preference', async () => {
    const res = await request(app)
      .put(`${apiBase}/account/notification-preferences`)
      .set(apiKeyHeaders(notificationsReadUpdateToken))
      .send(PREFERENCE_BODY);
    expect(res.status).toBe(200);
    expect(preferencesIncludePushDisabled(res.body)).toBe(true);
  });

  it('a history read key can list the content log and taste profile', async () => {
    const contentLog = await request(app)
      .get(`${apiBase}/account/content-log`)
      .query({ type: 'removed_content' })
      .set(apiKeyHeaders(historyReadToken));
    expect(contentLog.status).toBe(200);

    const tasteProfile = await request(app)
      .get(`${apiBase}/account/taste-profile`)
      .set(apiKeyHeaders(historyReadToken));
    expect(tasteProfile.status).toBe(200);
  });

  it('a full-access key cannot change listen-stats consent', async () => {
    const res = await request(app)
      .patch(`${apiBase}/account-settings/listen-stats`)
      .set(apiKeyHeaders(fullAccessToken))
      .send(LISTEN_STATS_BODY);
    expect(res.status).toBe(403);
    expect(res.body).toEqual(NOT_ALLOWED_BODY);
  });
});
