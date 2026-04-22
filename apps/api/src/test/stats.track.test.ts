import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import { config } from '../config/index.js';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';

const {
  statsTrackAccountCreateMock,
  statsTrackChannelCreateMock,
  statsTrackClipCreateMock,
  statsTrackItemCreateMock,
  statsTrackPlaylistCreateMock,
} = vi.hoisted(() => ({
  statsTrackAccountCreateMock: vi.fn(async () => {}),
  statsTrackChannelCreateMock: vi.fn(async () => {}),
  statsTrackClipCreateMock: vi.fn(async () => {}),
  statsTrackItemCreateMock: vi.fn(async () => {}),
  statsTrackPlaylistCreateMock: vi.fn(async () => {}),
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    async get(
      id: number,
      _options?: { relations?: string[] }
    ): Promise<{
      id: number;
      account_credentials: { email: string };
      account_membership_status: { membership_expires_at: Date };
    } | null> {
      if (id !== 1) {
        return null;
      }

      return {
        id: 1,
        account_credentials: { email: 'stats-track-test@example.com' },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      };
    }
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

  class MockStatsTrackEventPlaylistService {
    _create = statsTrackPlaylistCreateMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    StatsTrackEventAccountService: MockStatsTrackEventAccountService,
    StatsTrackEventChannelService: MockStatsTrackEventChannelService,
    StatsTrackEventClipService: MockStatsTrackEventClipService,
    StatsTrackEventItemService: MockStatsTrackEventItemService,
    StatsTrackEventPlaylistService: MockStatsTrackEventPlaylistService,
  };
});

const statsBase = `${config.api.prefix}${config.api.version}/stats`;

describe('stats track POST routes', () => {
  let server: import('http').Server | undefined;
  let ormContext: ORMContext | undefined;

  beforeAll(async () => {
    process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE =
      process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE ?? 'en-US';

    const { assertConfigValid, validateORMConfig } = await import('@podverse/helpers-config');
    const { createORMContext } = await import('@podverse/orm');
    const { config: appConfig } = await import('../config/index.js');

    const readRequiredTestEnv = (name: string): string => {
      const value = process.env[name];
      if (value === undefined || value === '') {
        throw new Error(`Missing or empty test env: ${name}`);
      }
      return value;
    };

    const ormConfig = {
      nodeEnv: appConfig.nodeEnv,
      database: {
        host: readRequiredTestEnv('DB_HOST'),
        port: parseInt(readRequiredTestEnv('DB_PORT'), 10),
        read_username: readRequiredTestEnv('DB_READ_USERNAME'),
        read_password: readRequiredTestEnv('DB_READ_PASSWORD'),
        read_write_username: readRequiredTestEnv('DB_READ_WRITE_USERNAME'),
        read_write_password: readRequiredTestEnv('DB_READ_WRITE_PASSWORD'),
        database: readRequiredTestEnv('DB_DATABASE'),
        ssl_connection: process.env.DB_SSL_CONNECTION === 'true',
      },
      log: {
        level: appConfig.log.level,
        dir: process.env.LOG_DIR ?? '',
        timer: process.env.LOG_TIMER === 'true',
      },
      defaults: {
        account: {
          settings: {
            locale: process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE,
          },
        },
      },
      addByRssCredentialsEncryptionKey:
        process.env.ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY ?? undefined,
      addByRssCredentialsEncryptionKeyOld:
        process.env.ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD ?? undefined,
    };
    assertConfigValid(validateORMConfig(ormConfig), 'podverse-orm');
    ormContext = createORMContext(ormConfig);
    await ormContext.dataSourceRead.initialize();
    await ormContext.dataSourceReadWrite.initialize();

    const { app, startApp } = await import('../app.js');
    const maybeServer = await startApp();
    if (maybeServer) {
      server = maybeServer;
    }
    expect(app).toBeDefined();
  });

  afterAll(async () => {
    if (server) {
      const s = server;
      await new Promise<void>((resolve, reject) => {
        s.close((err) => (err ? reject(err) : resolve()));
      });
    }
    if (ormContext) {
      await ormContext.dataSourceRead.destroy();
      await ormContext.dataSourceReadWrite.destroy();
    }
  });

  const authHeaders = (): { Authorization: string } => ({
    Authorization: `Bearer ${jwt.sign(
      { id: 1, email: 'stats-track-test@example.com' },
      JWT_SECRET,
      { expiresIn: '1h' }
    )}`,
  });

  it('returns 401 without auth for stats/account', async () => {
    const { app } = await import('../app.js');
    const res = await request(app).post(`${statsBase}/account`).send({ account_id_text: 'abc' });
    expect(res.status).toBe(401);
  });

  it('returns 201 for stats/account when authenticated', async () => {
    statsTrackAccountCreateMock.mockClear();
    const { app } = await import('../app.js');
    const res = await request(app)
      .post(`${statsBase}/account`)
      .set(authHeaders())
      .send({ account_id_text: 'target-account-id-text' });

    expect(res.status).toBe(201);
    expect(statsTrackAccountCreateMock).toHaveBeenCalledTimes(1);
  });

  it('invokes stats/account handler twice on repeated POST (client idempotent)', async () => {
    statsTrackAccountCreateMock.mockClear();
    const { app } = await import('../app.js');
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
    const { app } = await import('../app.js');
    const res = await request(app)
      .post(`${statsBase}/channel`)
      .set(authHeaders())
      .send({ channel_id_text: 'chan-id-text' });

    expect(res.status).toBe(201);
    expect(statsTrackChannelCreateMock).toHaveBeenCalledTimes(1);
  });

  it('returns 201 for stats/clip when authenticated', async () => {
    statsTrackClipCreateMock.mockClear();
    const { app } = await import('../app.js');
    const res = await request(app)
      .post(`${statsBase}/clip`)
      .set(authHeaders())
      .send({ clip_id_text: 'clip-id-text' });

    expect(res.status).toBe(201);
    expect(statsTrackClipCreateMock).toHaveBeenCalledTimes(1);
  });

  it('returns 201 for stats/item when authenticated', async () => {
    statsTrackItemCreateMock.mockClear();
    const { app } = await import('../app.js');
    const res = await request(app)
      .post(`${statsBase}/item`)
      .set(authHeaders())
      .send({ item_id_text: 'item-id-text' });

    expect(res.status).toBe(201);
    expect(statsTrackItemCreateMock).toHaveBeenCalledTimes(1);
  });

  it('returns 201 for stats/playlist when authenticated', async () => {
    statsTrackPlaylistCreateMock.mockClear();
    const { app } = await import('../app.js');
    const res = await request(app)
      .post(`${statsBase}/playlist`)
      .set(authHeaders())
      .send({ playlist_id_text: 'playlist-id-text' });

    expect(res.status).toBe(201);
    expect(statsTrackPlaylistCreateMock).toHaveBeenCalledTimes(1);
  });
});
