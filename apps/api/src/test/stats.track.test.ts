import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  authHeaders,
  defaultAccountGet,
  getBaseApiUrl,
  IntegrationTestNoopCategoryService,
  startTestApp,
  stopTestApp,
} from './helpers/index.js';

const {
  statsTrackAccountCreateMock,
  statsTrackChannelCreateMock,
  statsTrackClipCreateMock,
  statsTrackItemCreateMock,
  statsTrackPlaylistCreateMock,
  getAllowListenStatsMock,
} = vi.hoisted(() => ({
  statsTrackAccountCreateMock: vi.fn(async () => {}),
  statsTrackChannelCreateMock: vi.fn(async () => {}),
  statsTrackClipCreateMock: vi.fn(async () => {}),
  statsTrackItemCreateMock: vi.fn(async () => {}),
  statsTrackPlaylistCreateMock: vi.fn(async () => {}),
  getAllowListenStatsMock: vi.fn(async () => true),
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockAccountService {
    get = defaultAccountGet;
  }

  class MockStatsTrackEventAccountService {
    _create = statsTrackAccountCreateMock;
  }

  class MockStatsTrackEventChannelService {
    _create = statsTrackChannelCreateMock;
  }

  class MockStatsTrackEventClipService {
    _create = statsTrackClipCreateMock;
  }

  class MockStatsTrackEventItemService {
    _create = statsTrackItemCreateMock;
  }

  class MockAccountSettingsListenStatsService {
    getAllowListenStats = getAllowListenStatsMock;
  }

  class MockStatsTrackEventPlaylistService {
    _create = statsTrackPlaylistCreateMock;
  }

  return {
    ...actual,
    CategoryService: IntegrationTestNoopCategoryService,
    AccountService: MockAccountService,
    AccountSettingsListenStatsService: MockAccountSettingsListenStatsService,
    StatsTrackEventAccountService: MockStatsTrackEventAccountService,
    StatsTrackEventChannelService: MockStatsTrackEventChannelService,
    StatsTrackEventClipService: MockStatsTrackEventClipService,
    StatsTrackEventItemService: MockStatsTrackEventItemService,
    StatsTrackEventPlaylistService: MockStatsTrackEventPlaylistService,
  };
});

let statsBase: string;

describe('stats track POST routes', () => {
  let server: import('http').Server | undefined;
  let ormContext: import('@podverse/orm').ORMContext | undefined;
  let app: import('express').Express;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    statsBase = (await getBaseApiUrl()) + '/stats';
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('returns 401 without auth for stats/account', async () => {
    const res = await request(app).post(`${statsBase}/account`).send({ account_id_text: 'abc' });
    expect(res.status).toBe(401);
  });

  it('returns 201 for stats/account when authenticated', async () => {
    statsTrackAccountCreateMock.mockClear();
    const res = await request(app)
      .post(`${statsBase}/account`)
      .set(authHeaders())
      .send({ account_id_text: 'target-account-id-text' });

    expect(res.status).toBe(201);
    expect(statsTrackAccountCreateMock).toHaveBeenCalledTimes(1);
  });

  it('invokes stats/account handler twice on repeated POST (client idempotent)', async () => {
    statsTrackAccountCreateMock.mockClear();
    const headers = authHeaders();

    await request(app)
      .post(`${statsBase}/account`)
      .set(headers)
      .send({ account_id_text: 'repeat-account-id-text' });

    await request(app)
      .post(`${statsBase}/account`)
      .set(headers)
      .send({ account_id_text: 'repeat-account-id-text' });

    expect(statsTrackAccountCreateMock).toHaveBeenCalledTimes(2);
  });

  it('returns 201 for stats/channel when authenticated', async () => {
    statsTrackChannelCreateMock.mockClear();
    const res = await request(app)
      .post(`${statsBase}/channel`)
      .set(authHeaders())
      .send({ channel_id_text: 'chan-id-text' });

    expect(res.status).toBe(201);
    expect(statsTrackChannelCreateMock).toHaveBeenCalledTimes(1);
  });

  it('returns 201 for stats/clip when authenticated', async () => {
    statsTrackClipCreateMock.mockClear();
    const res = await request(app)
      .post(`${statsBase}/clip`)
      .set(authHeaders())
      .send({ clip_id_text: 'clip-id-text' });

    expect(res.status).toBe(201);
    expect(statsTrackClipCreateMock).toHaveBeenCalledTimes(1);
  });

  it('returns 201 for stats/item when authenticated', async () => {
    statsTrackItemCreateMock.mockClear();
    const res = await request(app)
      .post(`${statsBase}/item`)
      .set(authHeaders())
      .send({ item_id_text: 'item-id-text' });

    expect(res.status).toBe(201);
    expect(statsTrackItemCreateMock).toHaveBeenCalledTimes(1);
  });

  it('returns 201 for stats/playlist when authenticated', async () => {
    statsTrackPlaylistCreateMock.mockClear();
    const res = await request(app)
      .post(`${statsBase}/playlist`)
      .set(authHeaders())
      .send({ playlist_id_text: 'playlist-id-text' });

    expect(res.status).toBe(201);
    expect(statsTrackPlaylistCreateMock).toHaveBeenCalledTimes(1);
  });

  it('returns 403 for stats/item when allow_listen_stats is false', async () => {
    getAllowListenStatsMock.mockResolvedValueOnce(false);
    statsTrackItemCreateMock.mockClear();

    const res = await request(app)
      .post(`${statsBase}/item`)
      .set(authHeaders())
      .send({ item_id_text: 'blocked-item-id-text' });

    expect(res.status).toBe(403);
    expect(statsTrackItemCreateMock).not.toHaveBeenCalled();
  });
});
