import { generateKeyPairSync } from 'node:crypto';

import { buildRSSOnDemandDedupeKey } from '@api/controllers/mq/mq.js';
import { keyvaldb } from '@api/lib/keyvaldb/keyvaldb.js';
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BillingCadence } from '@podverse/helpers';
import {
  AccountMembershipEnum,
  DEFAULT_FREE_TRIAL_EXPIRATION,
  OnDemandParserEventType,
} from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  withMutedExpectedErrorLogs,
} from './helpers/index.js';

const TEST_EMAIL = 'es-meta-test@example.com';
const TEST_USER_ID = 1;
const MINT_OK_USER_ID = 2;
const MINT_OK_EMAIL = 'es-meta-mint-ok@example.com';

const {
  podcastGetByIdMock,
  searchPodcastsMock,
  feedGetByPodcastIndexIdMock,
  mediumGetAllMock,
  claimTokenMock,
  getAccountMock,
  mqRSSAddMock,
} = vi.hoisted(() => {
  const uid1 = 1;
  const uid2 = 2;
  return {
    podcastGetByIdMock: vi.fn(
      async () => ({ feedId: 1, title: 'P', podcastGuid: 'g' }) as Record<string, unknown> | null
    ),
    searchPodcastsMock: vi.fn(
      async () => ({ count: 1, feeds: [{ id: 1, title: 'S' }] }) as Record<string, unknown> | null
    ),
    feedGetByPodcastIndexIdMock: vi.fn(
      async () => ({ id: 1, feed_url: 'https://a.com/feed' }) as Record<string, unknown> | null
    ),
    mediumGetAllMock: vi.fn(async () => [
      { id: 1, name: 'podcast' },
      { id: 2, name: 'video' },
    ]),
    claimTokenMock: vi.fn(async () => {}),
    getAccountMock: vi.fn(
      async (
        id: number
      ): Promise<{
        id: number;
        id_text: string;
        account_credentials: { email: string };
        account_membership_status: {
          membership_expires_at: Date;
          account_membership: { id: AccountMembershipEnum; tier: 'trial' | 'premium' };
          billing_cadence: BillingCadence;
          auto_renew_mode: 'off' | 'on';
          next_renewal_attempt_at: Date | null;
          last_renewal_attempt_at: Date | null;
          last_renewal_status: 'none' | 'succeeded' | 'failed';
        };
      } | null> => {
        if (id === uid1) {
          return {
            id: uid1,
            id_text: 'es-meta-1',
            account_credentials: { email: 'es-meta-test@example.com' },
            account_membership_status: {
              membership_expires_at: new Date(Date.now() + 86400000 * 365),
              account_membership: { id: AccountMembershipEnum.Premium, tier: 'premium' },
              billing_cadence: 'annual',
              auto_renew_mode: 'on',
              next_renewal_attempt_at: null,
              last_renewal_attempt_at: null,
              last_renewal_status: 'none',
            },
          };
        }
        if (id === uid2) {
          return {
            id: uid2,
            id_text: 'es-meta-mint-ok',
            account_credentials: { email: 'es-meta-mint-ok@example.com' },
            account_membership_status: {
              membership_expires_at: new Date(Date.now() + 86400000 * 365),
              account_membership: { id: AccountMembershipEnum.Premium, tier: 'premium' },
              billing_cadence: 'annual',
              auto_renew_mode: 'on',
              next_renewal_attempt_at: null,
              last_renewal_attempt_at: null,
              last_renewal_status: 'none',
            },
          };
        }
        return null;
      }
    ),
    mqRSSAddMock: vi.fn(async () => {}),
  };
});

vi.mock('@api/factories/podcastIndexService.js', () => ({
  podcastIndexService: {
    podcastGetById: podcastGetByIdMock,
    searchPodcasts: searchPodcastsMock,
  },
}));

vi.mock('@podverse/mq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/mq')>();
  return { ...actual, mqRSSAdd: mqRSSAddMock };
});

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    get = getAccountMock;
  }

  class MockFeedService {
    getByPodcastIndexId = feedGetByPodcastIndexIdMock;
  }

  class MockMediumService {
    getAll = mediumGetAllMock;
  }

  class MockMembershipClaimTokenService {
    claim = claimTokenMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    FeedService: MockFeedService,
    MediumService: MockMediumService,
    MembershipClaimTokenService: MockMembershipClaimTokenService,
  };
});

const mintRequestBody = () => ({
  ingest_url: 'https://api.example.com/v1/s/mbrss-v1/boost/abc/',
  body_json: JSON.stringify({ sender_guid: 'sender-1', currency: 'BTC' }),
});

function auth(userId: number = TEST_USER_ID) {
  const idText =
    userId === MINT_OK_USER_ID
      ? 'es-meta-mint-ok'
      : userId === TEST_USER_ID
        ? 'es-meta-1'
        : `esmeta${String(userId).padStart(4, '0')}`;
  return authHeaders(userId, idText);
}

describe('external services, feed, medium-value, membership, claim, metaboost, mq', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let externalServicesBase: string;
  let feedBase: string;
  let mediumValueBase: string;
  let productMembershipBase: string;
  let claimBase: string;
  let metaboostBase: string;
  let mqBase: string;

  beforeAll(async () => {
    process.env.ACCOUNT_SIGNUP_MODE = 'user_signup_email';
    process.env.MEMBERSHIP_PREMIUM_COST_MONTHLY = '5';
    process.env.MEMBERSHIP_PREMIUM_COST_ANNUALLY = '50';

    const { privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.METABOOST_SIGNING_KEY_PEM = privateKey;
    process.env.METABOOST_APP_ASSERTION_ISS = 'es-meta-app-iss';

    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    const b = await getBaseApiUrl();
    externalServicesBase = `${b}/external-services`;
    feedBase = `${b}/feed`;
    mediumValueBase = `${b}/medium-value`;
    productMembershipBase = `${b}/product/membership`;
    claimBase = `${b}/membership-claim-token`;
    metaboostBase = `${b}/metaboost`;
    mqBase = `${b}/mq`;
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  beforeEach(() => {
    getAccountMock.mockReset();
    getAccountMock.mockImplementation(
      async (
        id: number
      ): Promise<{
        id: number;
        id_text: string;
        account_credentials: { email: string };
        account_membership_status: {
          membership_expires_at: Date;
          account_membership: { id: AccountMembershipEnum; tier: 'trial' | 'premium' };
          billing_cadence: BillingCadence;
          auto_renew_mode: 'off' | 'on';
          next_renewal_attempt_at: Date | null;
          last_renewal_attempt_at: Date | null;
          last_renewal_status: 'none' | 'succeeded' | 'failed';
        };
      } | null> => {
        if (id === TEST_USER_ID) {
          return {
            id: TEST_USER_ID,
            id_text: 'es-meta-1',
            account_credentials: { email: TEST_EMAIL },
            account_membership_status: {
              membership_expires_at: new Date(Date.now() + 86400000 * 365),
              account_membership: { id: AccountMembershipEnum.Premium, tier: 'premium' },
              billing_cadence: 'annual',
              auto_renew_mode: 'on',
              next_renewal_attempt_at: null,
              last_renewal_attempt_at: null,
              last_renewal_status: 'none',
            },
          };
        }
        if (id === MINT_OK_USER_ID) {
          return {
            id: MINT_OK_USER_ID,
            id_text: 'es-meta-mint-ok',
            account_credentials: { email: MINT_OK_EMAIL },
            account_membership_status: {
              membership_expires_at: new Date(Date.now() + 86400000 * 365),
              account_membership: { id: AccountMembershipEnum.Premium, tier: 'premium' },
              billing_cadence: 'annual',
              auto_renew_mode: 'on',
              next_renewal_attempt_at: null,
              last_renewal_attempt_at: null,
              last_renewal_status: 'none',
            },
          };
        }
        return null;
      }
    );
  });

  describe('ExternalServices (Podcast Index proxy)', () => {
    it('GET /podcast-index/feed/:id returns 200 with podcast data', async () => {
      podcastGetByIdMock.mockResolvedValueOnce({ title: 'Show', id: 99 } as never);
      const res = await request(app).get(`${externalServicesBase}/podcast-index/feed/100`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Show');
    });

    it('GET /podcast-index/feed/:id returns 500 when service returns no result', async () => {
      podcastGetByIdMock.mockResolvedValueOnce(null);
      const res = await withMutedExpectedErrorLogs(async () =>
        request(app).get(`${externalServicesBase}/podcast-index/feed/200`)
      );
      expect(res.status).toBe(500);
    });

    it('GET /podcast-index/search/podcasts returns 200 with q=…', async () => {
      searchPodcastsMock.mockResolvedValueOnce({ count: 2, feeds: [] } as never);
      const res = await request(app)
        .get(`${externalServicesBase}/podcast-index/search/podcasts`)
        .query({ q: 'search term' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 2, feeds: [] });
    });

    it('GET /podcast-index/search/podcasts returns 500 when search returns null', async () => {
      searchPodcastsMock.mockResolvedValueOnce(null);
      const res = await withMutedExpectedErrorLogs(async () =>
        request(app)
          .get(`${externalServicesBase}/podcast-index/search/podcasts`)
          .query({ q: 'nope' })
      );
      expect(res.status).toBe(500);
    });
  });

  describe('Feed by PodcastIndex ID', () => {
    it('returns 200 with feed JSON when found', async () => {
      feedGetByPodcastIndexIdMock.mockResolvedValueOnce({ id: 1, url: 'u' } as never);
      const res = await request(app).get(`${feedBase}/555`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
    });

    it('returns 200 with null when not in DB (SSR contract)', async () => {
      feedGetByPodcastIndexIdMock.mockResolvedValueOnce(null);
      const res = await request(app).get(`${feedBase}/666`);
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });

  describe('Medium value', () => {
    it('GET / returns array from MediumService', async () => {
      const res = await request(app).get(mediumValueBase);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Membership pricing', () => {
    it('GET /pricing returns data when user_signup_email is enabled, 400 when disabled (see MembershipController.getPricing)', async () => {
      const res = await request(app).get(`${productMembershipBase}/pricing`);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toMatchObject({
          costMonthly: 5,
          costAnnually: 50,
          freeTrialExpiration: DEFAULT_FREE_TRIAL_EXPIRATION,
          freeTrialDays: Math.floor(DEFAULT_FREE_TRIAL_EXPIRATION / 86400),
        });
      } else {
        expect(res.status).toBe(400);
        expect(String(res.body.message ?? '')).toMatch(/not enabled/i);
      }
    });
  });

  describe('Product membership defaults', () => {
    it('GET / returns env-derived numbers without authentication', async () => {
      const res = await request(app).get(productMembershipBase);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject({
        freeTrialExpirationSeconds: expect.any(Number),
        freeTrialDays: expect.any(Number),
        premiumMembershipCostMonthly: expect.any(Number),
        premiumMembershipCostAnnually: expect.any(Number),
        trialMaxAddByRSSFeeds: expect.any(Number),
        trialMaxManualRefreshesPerHour: expect.any(Number),
        premiumMaxAddByRSSFeeds: expect.any(Number),
        premiumMaxManualRefreshesPerHour: expect.any(Number),
        annuallySavingsPercent: expect.any(Number),
        monthlyEquivalentAnnually: expect.any(Number),
      });
      expect(res.body.data.freeTrialExpirationSeconds).toBeGreaterThan(0);
    });

    it('GET /billing-read-model returns pricing + renewal visibility for authenticated user', async () => {
      const res = await request(app)
        .get(`${productMembershipBase}/billing-read-model`)
        .set(auth(TEST_USER_ID))
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject({
        tier: expect.any(String),
        membershipExpiresAt: expect.any(String),
        cadence: expect.any(String),
        autoRenewMode: expect.any(String),
        autoRenewEnabled: expect.any(Boolean),
        renewal: {
          nextAttemptAt: null,
          lastAttemptAt: null,
          lastStatus: expect.any(String),
        },
        pricing: {
          currencyCode: 'USD',
          premiumMonthly: expect.any(Number),
          premiumAnnual: expect.any(Number),
        },
      });
    });
  });

  describe('Membership claim token', () => {
    it('POST /claim/:token returns 200 when service succeeds', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: 'es-meta-1',
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: { membership_expires_at: new Date(Date.now() + 86400000) },
      });
      const res = await request(app).post(`${claimBase}/claim/tok-valid`).set(auth()).send({});
      expect(res.status).toBe(200);
      expect(claimTokenMock).toHaveBeenCalledWith(TEST_USER_ID, 'tok-valid');
    });

    it('returns 500 with message when claim service throws (invalid / used / missing token)', async () => {
      claimTokenMock.mockRejectedValueOnce(new Error('MembershipClaimToken not found'));
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: 'es-meta-1',
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: { membership_expires_at: new Date(Date.now() + 86400000) },
      });
      const res = await withMutedExpectedErrorLogs(async () =>
        request(app).post(`${claimBase}/claim/bad-tok`).set(auth()).send({})
      );
      expect(res.status).toBe(500);
      expect(String(res.body.message || '')).toMatch(/not found/);
    });

    it('returns 401 when not authenticated', async () => {
      const res = await request(app).post(`${claimBase}/claim/t1`).send({});
      expect(res.status).toBe(401);
    });
  });

  describe('Metaboost mbrss-v1', () => {
    it('GET mbrss-v1/mint-app-assertion/rate-limit-status returns 200 when authenticated', async () => {
      getAccountMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: 'es-meta-1',
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: { membership_expires_at: new Date(Date.now() + 86400000) },
      });
      const res = await request(app)
        .get(`${metaboostBase}/mbrss-v1/mint-app-assertion/rate-limit-status`)
        .set(auth());
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ allowed: true });
    });

    it('GET rate-limit-status returns 401 without auth', async () => {
      const res = await request(app).get(
        `${metaboostBase}/mbrss-v1/mint-app-assertion/rate-limit-status`
      );
      expect(res.status).toBe(401);
    });

    it('POST mint returns 200 with authorization and ingest_url when body is valid and keys are set', async () => {
      const res = await request(app)
        .post(`${metaboostBase}/mbrss-v1/mint-app-assertion`)
        .set(auth(MINT_OK_USER_ID))
        .send(mintRequestBody());
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('authorization');
      expect(res.body).toHaveProperty('ingest_url');
    });

    it('POST mint returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${metaboostBase}/mbrss-v1/mint-app-assertion`)
        .send(mintRequestBody());
      expect(res.status).toBe(401);
    });

    it('second POST within window returns 429 (custom mint rate limit)', async () => {
      const future = new Date(Date.now() + 86400000);
      getAccountMock.mockImplementation(async (id: number) => {
        if (id !== TEST_USER_ID) {
          return null;
        }
        return {
          id: TEST_USER_ID,
          id_text: 'es-meta-1',
          account_credentials: { email: TEST_EMAIL },
          account_membership_status: { membership_expires_at: future },
        };
      });
      const body = mintRequestBody();
      const a = auth();
      const r1 = await request(app)
        .post(`${metaboostBase}/mbrss-v1/mint-app-assertion`)
        .set(a)
        .send(body);
      const r2 = await request(app)
        .post(`${metaboostBase}/mbrss-v1/mint-app-assertion`)
        .set(a)
        .send(body);
      expect(r1.status).toBe(200);
      expect(r2.status).toBe(429);
      expect(r2.body).toMatchObject({ tooManyRequests: true });
    });
  });

  describe('MQ on-demand', () => {
    const bodyAdd = { url: 'https://feeds.example.com/only-add.xml', podcast_index_id: 42 };
    const bodyRefresh = { url: 'https://feeds.example.com/only-refresh.xml', podcast_index_id: 42 };
    const bodyThrow = { url: 'https://feeds.example.com/only-500.xml', podcast_index_id: 99 };

    beforeEach(async () => {
      for (const key of [
        buildRSSOnDemandDedupeKey(TEST_USER_ID, OnDemandParserEventType.ADD, bodyAdd.url),
        buildRSSOnDemandDedupeKey(TEST_USER_ID, OnDemandParserEventType.REFRESH, bodyRefresh.url),
        buildRSSOnDemandDedupeKey(TEST_USER_ID, OnDemandParserEventType.ADD, bodyThrow.url),
      ]) {
        await keyvaldb.del(key);
      }
    });

    it('POST /rss/add/on-demand returns 201 and calls mqRSSAdd', async () => {
      mqRSSAddMock.mockClear();
      const res = await request(app).post(`${mqBase}/rss/add/on-demand`).set(auth()).send(bodyAdd);
      expect(res.status).toBe(201);
      expect(mqRSSAddMock).toHaveBeenCalled();
    });

    it('POST /rss/refresh/on-demand returns 201 and calls mqRSSAdd', async () => {
      mqRSSAddMock.mockClear();
      const res = await request(app)
        .post(`${mqBase}/rss/refresh/on-demand`)
        .set(auth())
        .send(bodyRefresh);
      expect(res.status).toBe(201);
      expect(mqRSSAddMock).toHaveBeenCalled();
    });

    it('returns 500 when mqRSSAdd throws', async () => {
      mqRSSAddMock.mockRejectedValueOnce(new Error('MQ down'));
      const res = await withMutedExpectedErrorLogs(async () =>
        request(app).post(`${mqBase}/rss/add/on-demand`).set(auth()).send(bodyThrow)
      );
      expect(res.status).toBe(500);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).post(`${mqBase}/rss/add/on-demand`).send(bodyAdd);
      expect(res.status).toBe(401);
    });
  });
});
