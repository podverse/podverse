import { config } from '@api/config/index.js';
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PopularityListenResult, PopularityOpenResult } from '@podverse/helpers';
import { AccountMembershipEnum } from '@podverse/helpers';
import type { ORMContext, StatsListenReport, StatsOpenReport } from '@podverse/orm';

import {
  authHeaders,
  defaultAccountGet,
  getBaseApiUrl,
  IntegrationTestNoopCategoryService,
  startTestApp,
  stopTestApp,
} from './helpers/index.js';

const TEST_USER_ID = 1;

const CLIENT_LISTEN_ID = '3f6c2a9e-8d41-4b7a-9c35-1e2f4a6b8c0d';

const { accountGetMock, recordListenMock, recordOpenMock, isListenStatsAllowedMock } = vi.hoisted(
  () => ({
    accountGetMock:
      vi.fn<
        (id: number, options?: { relations?: string[] }) => Promise<Record<string, unknown> | null>
      >(),
    recordListenMock: vi.fn<(report: StatsListenReport) => Promise<PopularityListenResult>>(),
    recordOpenMock: vi.fn<(report: StatsOpenReport) => Promise<PopularityOpenResult>>(),
    isListenStatsAllowedMock: vi.fn<() => Promise<boolean>>(),
  })
);

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockAccountService {
    get = accountGetMock;
  }

  class MockAccountSettingsListenStatsService {
    isListenStatsAllowed = isListenStatsAllowedMock;
  }

  class MockStatsListenWriteService {
    recordListen = recordListenMock;
  }

  class MockStatsOpenWriteService {
    recordOpen = recordOpenMock;
  }

  return {
    ...actual,
    CategoryService: IntegrationTestNoopCategoryService,
    AccountService: MockAccountService,
    AccountSettingsListenStatsService: MockAccountSettingsListenStatsService,
    StatsListenWriteService: MockStatsListenWriteService,
    StatsOpenWriteService: MockStatsOpenWriteService,
  };
});

type StatsTrackRateLimitModule = typeof import('@api/controllers/stats/statsTrackRateLimit.js');

let statsBase: string;

describe('stats listen and open POST routes', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let statsTrackRateLimit: StatsTrackRateLimitModule['statsTrackRateLimit'];

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    statsBase = (await getBaseApiUrl()) + '/stats';
    // `startTestApp` resets the module registry, so the limiter the routes use is only reachable
    // through an import made after it.
    ({ statsTrackRateLimit } = await import('@api/controllers/stats/statsTrackRateLimit.js'));
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  beforeEach(() => {
    accountGetMock.mockReset();
    accountGetMock.mockImplementation(defaultAccountGet);
    recordListenMock.mockReset();
    recordListenMock.mockResolvedValue('counted');
    recordOpenMock.mockReset();
    recordOpenMock.mockResolvedValue('counted');
    isListenStatsAllowedMock.mockReset();
    isListenStatsAllowedMock.mockResolvedValue(true);
    // The limiter store is in-memory for the process lifetime; the case that exhausts it would
    // otherwise 429 every case after it.
    statsTrackRateLimit.resetForUser(TEST_USER_ID);
  });

  const postListen = (body: object) =>
    request(app).post(`${statsBase}/listen`).set(authHeaders(TEST_USER_ID)).send(body);

  const postOpen = (body: object) =>
    request(app).post(`${statsBase}/open`).set(authHeaders(TEST_USER_ID)).send(body);

  const listenBody = {
    item_id_text: 'item-id-text',
    client_listen_id: CLIENT_LISTEN_ID,
    seconds_heard: 75,
  };

  describe('authentication', () => {
    it('returns 401 without auth for stats/listen', async () => {
      const res = await request(app).post(`${statsBase}/listen`).send(listenBody);

      expect(res.status).toBe(401);
      expect(recordListenMock).not.toHaveBeenCalled();
    });

    it('returns 401 without auth for stats/open', async () => {
      const res = await request(app)
        .post(`${statsBase}/open`)
        .send({ playlist_id_text: 'playlist-id-text' });

      expect(res.status).toBe(401);
      expect(recordOpenMock).not.toHaveBeenCalled();
    });

    it('returns 403 feature_not_available_for_account_type when a premium account lacks trackStats', async () => {
      accountGetMock.mockImplementation(async (id) => {
        const account = await defaultAccountGet(id);
        return account === null
          ? null
          : {
              ...account,
              account_membership_status: {
                ...account.account_membership_status,
                track_stats: false,
              },
            };
      });

      const res = await postListen(listenBody);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('feature_not_available_for_account_type');
      expect(recordListenMock).not.toHaveBeenCalled();
    });

    it('records a trial listen with counts_toward_popularity false', async () => {
      accountGetMock.mockImplementation(async (id) => {
        const account = await defaultAccountGet(id);
        return account === null
          ? null
          : {
              ...account,
              account_membership_status: {
                ...account.account_membership_status,
                account_membership: { id: AccountMembershipEnum.Trial },
              },
            };
      });

      const res = await postListen(listenBody);

      expect(res.status).toBe(201);
      expect(recordListenMock).toHaveBeenCalledTimes(1);
      expect(recordListenMock.mock.calls[0]?.[0]).toMatchObject({
        counts_toward_popularity: false,
      });
    });

    it('returns 403 feature_not_available_for_account_type for a trial open even when trackStats is on', async () => {
      accountGetMock.mockImplementation(async (id) => {
        const account = await defaultAccountGet(id);
        return account === null
          ? null
          : {
              ...account,
              account_membership_status: {
                ...account.account_membership_status,
                track_stats: true,
                account_membership: { id: AccountMembershipEnum.Trial },
              },
            };
      });

      const res = await postOpen({ playlist_id_text: 'playlist-id-text' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('feature_not_available_for_account_type');
      expect(recordOpenMock).not.toHaveBeenCalled();
    });

    it('returns 403 taste_profile_consent_required when consent is not current, without calling the service', async () => {
      isListenStatsAllowedMock.mockResolvedValue(false);

      const res = await postListen(listenBody);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        message: 'Listen stats tracking is disabled for this account',
        code: 'taste_profile_consent_required',
      });
      expect(recordListenMock).not.toHaveBeenCalled();
    });
  });

  describe('POST /stats/listen', () => {
    it('passes exactly the report fields to the service, with the configured version, daily caps, minimum interval, recount days, and flag signals', async () => {
      const res = await postListen({
        clip_id_text: 'clip-id-text',
        client_listen_id: CLIENT_LISTEN_ID,
        seconds_heard: 75,
        completed: true,
        listened_at: '2026-01-01T00:00:00.000Z',
      });

      expect(res.status).toBe(201);
      expect(recordListenMock).toHaveBeenCalledTimes(1);
      expect(recordListenMock.mock.calls[0]?.[0]).toEqual({
        account_id: TEST_USER_ID,
        agreement_version: config.tasteProfileAgreement.version,
        stored_daily_cap: config.popularityTracking.dailyListenStoredCap,
        popularity_daily_cap: config.popularityTracking.dailyListenPopularityCap,
        min_interval_seconds: config.popularityTracking.listenMinIntervalSeconds,
        all_time_recount_days: config.popularityTracking.allTimeRecountDays,
        flag_too_soon_minutes: config.popularityTracking.flagTooSoonMinutes,
        flag_stored_cap_within_hours: config.popularityTracking.flagStoredCapWithinHours,
        counts_toward_popularity: true,
        target: { kind: 'clip', id_text: 'clip-id-text' },
        client_listen_id: CLIENT_LISTEN_ID,
        seconds_heard: 75,
        completed: true,
        media_duration_seconds: null,
      });
    });

    it('defaults completed to false and targets the item when item_id_text is sent', async () => {
      await postListen(listenBody);

      expect(recordListenMock.mock.calls[0]?.[0]).toMatchObject({
        target: { kind: 'item', id_text: 'item-id-text' },
        completed: false,
      });
    });

    it('answers 201 with the result when a new session is counted', async () => {
      const res = await postListen(listenBody);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ result: 'counted' });
    });

    it.each(['updated', 'unchanged', 'daily_cap_reached', 'too_soon'] as const)(
      'answers 200 with the result for %s',
      async (result) => {
        recordListenMock.mockResolvedValue(result);

        const res = await postListen(listenBody);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ result });
      }
    );

    it('answers 400 listen_below_threshold when the listen does not meet the counted-listen rule', async () => {
      recordListenMock.mockResolvedValue('below_threshold');

      const res = await postListen(listenBody);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: 'Listen does not meet the counted-listen rule.',
        code: 'listen_below_threshold',
      });
    });

    it('answers 403 taste_profile_consent_required when the service finds consent missing', async () => {
      recordListenMock.mockResolvedValue('not_allowed');

      const res = await postListen(listenBody);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        message: 'Listen stats tracking is disabled for this account',
        code: 'taste_profile_consent_required',
      });
    });

    it('answers 404 when the item or clip is not found', async () => {
      recordListenMock.mockResolvedValue('not_found');

      const res = await postListen(listenBody);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'Not found', code: 'not_found' });
    });

    it("answers 410 when the clip's source was removed", async () => {
      recordListenMock.mockResolvedValue('clip_source_removed');

      const res = await postListen({
        clip_id_text: 'clip-id-text',
        client_listen_id: CLIENT_LISTEN_ID,
        seconds_heard: 75,
      });

      expect(res.status).toBe(410);
      expect(res.body).toEqual({ message: 'Clip source was removed', removed: true });
    });

    it.each([
      ['both ids', { ...listenBody, clip_id_text: 'clip-id-text' }],
      ['neither id', { client_listen_id: CLIENT_LISTEN_ID, seconds_heard: 75 }],
      ['a missing client_listen_id', { item_id_text: 'item-id-text', seconds_heard: 75 }],
      ['a non-uuid client_listen_id', { ...listenBody, client_listen_id: 'not-a-uuid' }],
      ['a negative seconds_heard', { ...listenBody, seconds_heard: -1 }],
      ['a seconds_heard above one day', { ...listenBody, seconds_heard: 86401 }],
      [
        'a missing seconds_heard',
        { item_id_text: 'item-id-text', client_listen_id: CLIENT_LISTEN_ID },
      ],
    ])('answers 400 for %s without calling the service', async (_label, body) => {
      const res = await postListen(body);

      expect(res.status).toBe(400);
      expect(recordListenMock).not.toHaveBeenCalled();
    });
  });

  describe('POST /stats/open', () => {
    it('answers 201 for the first open today and passes the target to the service', async () => {
      const res = await postOpen({ playlist_id_text: 'playlist-id-text' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ result: 'counted' });
      expect(recordOpenMock.mock.calls[0]?.[0]).toEqual({
        account_id: TEST_USER_ID,
        agreement_version: config.tasteProfileAgreement.version,
        daily_cap: config.popularityTracking.dailyOpenCap,
        all_time_recount_days: config.popularityTracking.allTimeRecountDays,
        target: { kind: 'playlist', id_text: 'playlist-id-text' },
      });
    });

    it('targets the profile when account_id_text is sent', async () => {
      await postOpen({ account_id_text: 'target-account-id-text' });

      expect(recordOpenMock.mock.calls[0]?.[0]).toMatchObject({
        target: { kind: 'account', id_text: 'target-account-id-text' },
      });
    });

    it('answers 200 with the result when the opener reached the daily cap', async () => {
      recordOpenMock.mockResolvedValue('daily_cap_reached');

      const res = await postOpen({ playlist_id_text: 'playlist-id-text' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ result: 'daily_cap_reached' });
    });

    it.each(['unchanged', 'own_content'] as const)(
      'answers 200 with the result for %s',
      async (result) => {
        recordOpenMock.mockResolvedValue(result);

        const res = await postOpen({ account_id_text: 'target-account-id-text' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ result });
      }
    );

    it('answers 404 when the profile or playlist is not found', async () => {
      recordOpenMock.mockResolvedValue('not_found');

      const res = await postOpen({ playlist_id_text: 'missing-playlist' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'Not found', code: 'not_found' });
    });

    it('answers 400 when both ids are sent, without calling the service', async () => {
      const res = await postOpen({
        account_id_text: 'target-account-id-text',
        playlist_id_text: 'playlist-id-text',
      });

      expect(res.status).toBe(400);
      expect(recordOpenMock).not.toHaveBeenCalled();
    });
  });

  describe('rate limit', () => {
    it('answers 429 once the account reaches its per-minute ceiling', async () => {
      const max = config.rateLimits.statsTrack.max;

      for (let sent = 0; sent < max; sent += 1) {
        const allowed = await postListen(listenBody);
        expect(allowed.status).toBe(201);
      }

      const limited = await postListen(listenBody);
      expect(limited.status).toBe(429);
      expect(limited.headers['ratelimit-limit']).toBe(String(max));
      expect(recordListenMock).toHaveBeenCalledTimes(max);
    });

    it('counts listens and opens against one shared budget', async () => {
      const max = config.rateLimits.statsTrack.max;

      for (let sent = 0; sent < max; sent += 1) {
        await postOpen({ playlist_id_text: 'playlist-id-text' });
      }

      const limited = await postListen(listenBody);
      expect(limited.status).toBe(429);
      expect(recordListenMock).not.toHaveBeenCalled();
    });
  });
});
