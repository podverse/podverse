import { config } from '@api/config/index.js';
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { apiKeyPermissionsForPreset, getAccountSignupModeCapabilities } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  apiKeyHeaders,
  createApiKeyTestAccount,
  createTestApiKey,
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

const NOT_ALLOWED_BODY = {
  message: 'API keys cannot be used for this endpoint.',
  code: 'api_key_not_allowed',
};

const EMAIL_FLOWS_CLOSED_BODY = {
  message: 'Email verification flows are not available in the current mode',
};

const EMAIL_FLOWS_AVAILABLE = getAccountSignupModeCapabilities(
  config.premium.signupMode
).canUseEmailVerificationFlows;

type DeniedMethod = 'get' | 'post' | 'patch' | 'delete';

type DeniedRoute = {
  method: DeniedMethod;
  path: string;
  body?: { terms_version: string } | { accepted: boolean };
  /** requireEmailFlows answers before the handler authenticates. */
  emailFlows?: boolean;
};

const DENIED_ROUTES: DeniedRoute[] = [
  { method: 'get', path: '/auth/check-session' },
  { method: 'get', path: '/auth/sessions' },
  { method: 'post', path: '/auth/sessions/revoke-others' },
  { method: 'delete', path: '/auth/sessions/pvtestid01' },
  { method: 'get', path: '/auth/api-keys' },
  { method: 'post', path: '/auth/api-keys' },
  { method: 'delete', path: '/auth/api-keys/pvtestid01' },
  { method: 'get', path: '/auth/second-factor' },
  { method: 'post', path: '/auth/second-factor/enroll' },
  { method: 'post', path: '/auth/second-factor/enroll/confirm' },
  { method: 'post', path: '/auth/second-factor/disable' },
  { method: 'post', path: '/auth/second-factor/backup-codes' },
  { method: 'post', path: '/account/change-password' },
  { method: 'post', path: '/account/send-change-email-address-email', emailFlows: true },
  { method: 'delete', path: '/account/delete' },
  { method: 'get', path: '/account/download-data' },
  {
    method: 'post',
    path: '/account/accept-terms',
    body: { terms_version: config.terms.version },
  },
  { method: 'patch', path: '/account-settings/listen-stats', body: { accepted: true } },
  { method: 'get', path: '/legal/taste-profile-agreement' },
  { method: 'post', path: '/stats/listen' },
  { method: 'post', path: '/stats/open' },
  { method: 'get', path: '/billing/status' },
  { method: 'post', path: '/billing/paypal/orders' },
  { method: 'post', path: '/billing/paypal/orders/abc123/capture' },
  { method: 'post', path: '/billing/apple/transactions' },
  { method: 'post', path: '/billing/google/purchases' },
  { method: 'post', path: '/billing/restore' },
  { method: 'post', path: '/billing/strike/checkouts' },
  { method: 'get', path: '/billing/strike/checkouts/abc123' },
  { method: 'post', path: '/billing/test/simulate' },
  { method: 'post', path: '/membership-claim-token/claim/abcdefghij' },
  { method: 'get', path: '/metaboost/mbrss-v1/mint-app-assertion/rate-limit-status' },
  { method: 'post', path: '/metaboost/mbrss-v1/mint-app-assertion' },
];

type TestAccount = { id: number; email: string; password: string };

function setCookies(res: request.Response): string[] {
  const header: unknown = res.headers['set-cookie'];
  if (Array.isArray(header)) {
    return header.filter((value): value is string => typeof value === 'string');
  }
  return typeof header === 'string' ? [header] : [];
}

function jwtCookie(res: request.Response): string {
  const cookie = setCookies(res).find((value) => value.startsWith('jwt='));
  if (cookie === undefined) {
    throw new Error('Login set no jwt cookie');
  }
  const token = cookie.slice('jwt='.length).split(';')[0] ?? '';
  if (token === '') {
    throw new Error('Login set an empty jwt cookie');
  }
  return `jwt=${token}`;
}

describe('routes that never accept an API key', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let apiBase: string;
  let account: TestAccount;
  let token: string;

  beforeAll(async () => {
    const started = await startTestApp({ accountSessions: 'real' });
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for API key route denial integration test');
    }
    apiBase = await getBaseApiUrl();
    account = await createApiKeyTestAccount('api-key-routes-denied-');
    token = await createTestApiKey(account.id, apiKeyPermissionsForPreset('full_access'));
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  function callRoute(route: DeniedRoute) {
    const url = `${apiBase}${route.path}`;
    const headers = apiKeyHeaders(token);
    if (route.method === 'get') {
      return request(app).get(url).set(headers);
    }
    if (route.method === 'post') {
      const pending = request(app).post(url).set(headers);
      return route.body === undefined ? pending : pending.send(route.body);
    }
    if (route.method === 'patch') {
      const pending = request(app).patch(url).set(headers);
      return route.body === undefined ? pending : pending.send(route.body);
    }
    const pending = request(app).delete(url).set(headers);
    return route.body === undefined ? pending : pending.send(route.body);
  }

  it('covers every route that stays closed to a key', () => {
    expect(DENIED_ROUTES).toHaveLength(33);
  });

  it.each(DENIED_ROUTES)('$method $path refuses a full-access key', async (route) => {
    const res = await callRoute(route);
    expect(res.status).toBe(403);
    if (route.emailFlows === true && !EMAIL_FLOWS_AVAILABLE) {
      expect(res.body).toEqual(EMAIL_FLOWS_CLOSED_BODY);
      return;
    }
    expect(res.body).toEqual(NOT_ALLOWED_BODY);
  });

  it('the account and its password still work after the closed routes refuse the key', async () => {
    const me = await request(app).get(`${apiBase}/auth/me`).set(apiKeyHeaders(token));
    expect(me.status).toBe(200);

    const login = await request(app)
      .post(`${apiBase}/auth/login`)
      .send({ email: account.email, password: account.password });
    expect(login.status).toBe(200);
  });

  it('a web session can list sessions on a route closed to keys', async () => {
    const login = await request(app)
      .post(`${apiBase}/auth/login`)
      .send({ email: account.email, password: account.password });
    expect(login.status).toBe(200);

    const sessions = await request(app)
      .get(`${apiBase}/auth/sessions`)
      .set('Cookie', jwtCookie(login));
    expect(sessions.status).toBe(200);
  });
});
