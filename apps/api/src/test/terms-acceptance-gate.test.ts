import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AccountMembershipEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  TEST_USER_ACCOUNT_ID_TEXT,
} from './helpers/index.js';

const TEST_USER_ID = 1;
const CURRENT_TERMS_VERSION = '2026-01-01';

type TermsAcceptanceRow = { terms_version: string; accepted_at: Date } | null;

const { termsAcceptance } = vi.hoisted(() => ({
  termsAcceptance: {
    current: undefined as TermsAcceptanceRow | undefined,
  },
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    async get(id: number): Promise<Record<string, unknown> | null> {
      if (id !== TEST_USER_ID) {
        return null;
      }
      const account: Record<string, unknown> = {
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: 'terms-gate@example.com' },
        billing_customer_ref: null,
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
          account_membership: {
            id: AccountMembershipEnum.Premium,
            tier: 'premium',
          },
          billing_cadence: null,
        },
      };
      if (termsAcceptance.current !== undefined) {
        account.account_terms_acceptance = termsAcceptance.current;
      }
      return account;
    }

    async getWithMembershipStatusFromPrimary(
      id: number
    ): Promise<Record<string, unknown> | null> {
      return this.get(id);
    }

    async delete(): Promise<void> {}
  }

  class MockAccountDataExportService {
    async exportUserData(): Promise<{ account: { id: number } }> {
      return { account: { id: TEST_USER_ID } };
    }
  }

  class MockAccountFollowingChannelService {
    async getFollowedChannels(): Promise<unknown[]> {
      return [];
    }
  }

  class MockAccountFollowingAddByRSSChannelService {
    async getFollowedAddByRSSChannels(): Promise<unknown[]> {
      return [];
    }
  }

  class MockAccountSettingsLocaleService {
    async getByAccountId(): Promise<{ locale: string }> {
      return { locale: 'en-US' };
    }
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    AccountDataExportService: MockAccountDataExportService,
    AccountFollowingChannelService: MockAccountFollowingChannelService,
    AccountFollowingAddByRSSChannelService: MockAccountFollowingAddByRSSChannelService,
    AccountSettingsLocaleService: MockAccountSettingsLocaleService,
  };
});

describe('terms acceptance gate', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let base: string;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    base = await getBaseApiUrl();
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('returns the public terms document without authentication', async () => {
    const res = await request(app).get(`${base}/legal/terms`);

    expect(res.status).toBe(200);
    expect(res.body.version).toBe(CURRENT_TERMS_VERSION);
    expect(res.body.markdown).toContain('PodverseTest will never sell');
    expect(res.body.markdown).toContain('Test Legal');
  });

  it('returns Spanish terms when Accept-Language is es', async () => {
    const res = await request(app).get(`${base}/legal/terms`).set('Accept-Language', 'es');

    expect(res.status).toBe(200);
    expect(res.body.markdown).toContain('nunca venderá');
  });

  it('returns 403 on an authenticated route when terms are missing or stale', async () => {
    termsAcceptance.current = null;
    const missing = await request(app).get(`${base}/legal/popularity-tracking`).set(authHeaders());
    expect(missing.status).toBe(403);
    expect(missing.body.code).toBe('terms_acceptance_required');

    termsAcceptance.current = {
      terms_version: '2025-01-01',
      accepted_at: new Date('2025-01-01T00:00:00.000Z'),
    };
    const stale = await request(app).get(`${base}/legal/popularity-tracking`).set(authHeaders());
    expect(stale.status).toBe(403);
    expect(stale.body.code).toBe('terms_acceptance_required');
  });

  it('allows account-access endpoints when terms are missing or stale', async () => {
    termsAcceptance.current = {
      terms_version: '2025-01-01',
      accepted_at: new Date('2025-01-01T00:00:00.000Z'),
    };

    const billing = await request(app).get(`${base}/billing/status`).set(authHeaders());
    expect(billing.status).toBe(200);
    expect(billing.body.tier).toBe('premium');

    const download = await request(app).get(`${base}/account/download-data`).set(authHeaders());
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toContain('application/zip');

    const opml = await request(app).get(`${base}/account/opml/export`).set(authHeaders());
    expect(opml.status).toBe(200);

    const deleted = await request(app).delete(`${base}/account/delete`).set(authHeaders());
    expect(deleted.status).toBe(200);
    expect(deleted.body.message).toBe('Account deleted successfully');
  });

  it('allows check-session and the popularity agreement after the current terms are accepted', async () => {
    termsAcceptance.current = {
      terms_version: CURRENT_TERMS_VERSION,
      accepted_at: new Date('2026-01-01T00:00:00.000Z'),
    };

    const session = await request(app).get(`${base}/auth/check-session`).set(authHeaders());
    expect(session.status).toBe(200);

    termsAcceptance.current = null;
    const sessionWithoutTerms = await request(app)
      .get(`${base}/auth/check-session`)
      .set(authHeaders());
    expect(sessionWithoutTerms.status).toBe(200);

    termsAcceptance.current = {
      terms_version: CURRENT_TERMS_VERSION,
      accepted_at: new Date('2026-01-01T00:00:00.000Z'),
    };
    const popularity = await request(app)
      .get(`${base}/legal/popularity-tracking`)
      .set(authHeaders());
    expect(popularity.status).toBe(200);
  });
});
