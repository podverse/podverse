import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { type Mock, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';

export type TestAppResult = {
  app: import('express').Express;
  server: Server | undefined;
  ormContext: ORMContext | undefined;
};

export async function startTestApp(): Promise<TestAppResult> {
  // Each API integration test file provides its own @podverse/orm mock.
  // Reset modules so dynamic imports below pick up the current file's mocks and a fresh app instance.
  vi.resetModules();

  process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE =
    process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE ?? 'en-US';

  const { assertConfigValid, validateORMConfig } = await import('@podverse/helpers-config');
  const { createORMContext } = await import('@podverse/orm');
  const { config: appConfig } = await import('../../config/index.js');

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
  const ormContext = createORMContext(ormConfig);
  await ormContext.dataSourceRead.initialize();
  await ormContext.dataSourceReadWrite.initialize();

  const { app, startApp } = await import('../../app.js');
  const maybeServer = await startApp();

  return { app, server: maybeServer ?? undefined, ormContext };
}

export async function stopTestApp(
  server: Server | undefined,
  ormContext: ORMContext | undefined
): Promise<void> {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
  if (ormContext) {
    await ormContext.dataSourceRead.destroy();
    await ormContext.dataSourceReadWrite.destroy();
  }
}

export function authHeaders(
  userId: number = 1,
  email: string = 'stats-track-test@example.com'
): { Authorization: string } {
  return {
    Authorization: `Bearer ${jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '1h' })}`,
  };
}

/** Same as {@link authHeaders} with admin-flavored default email (for admin-scoped routes in tests). */
export function adminAuthHeaders(
  userId: number = 1,
  email: string = 'admin-e2e@example.com'
): { Authorization: string } {
  return {
    Authorization: `Bearer ${jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '1h' })}`,
  };
}

/**
 * `vi.fn(async () => value)` with a consistent name for ORM and service stubs in integration tests.
 */
export function createMockFn<T>(resolved: T | Promise<T>): Mock<() => Promise<T>> {
  return vi.fn(async () => resolved) as unknown as Mock<() => Promise<T>>;
}

export async function getBaseApiUrl(): Promise<string> {
  const { config } = await import('../../config/index.js');
  return `${config.api.prefix}${config.api.version}`;
}

/**
 * Mutes expected error/warn output for a single assertion path.
 * Use for tests that intentionally exercise error responses (401/403/500) and would otherwise
 * print noisy logs that look like suite failures.
 */
export async function withMutedExpectedErrorLogs<T>(run: () => Promise<T> | T): Promise<T> {
  const restoreFns: Array<() => void> = [];

  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  restoreFns.push(() => errorSpy.mockRestore());
  restoreFns.push(() => warnSpy.mockRestore());

  const { loggerService } = await import('@api/factories/loggerService.js');
  const loggerLogErrorSpy = vi.spyOn(loggerService, 'logError').mockImplementation(() => {});
  const loggerErrorSpy = vi.spyOn(loggerService, 'error').mockImplementation(() => {});
  const loggerWarnSpy = vi.spyOn(loggerService, 'warn').mockImplementation(() => {});
  restoreFns.push(() => loggerLogErrorSpy.mockRestore());
  restoreFns.push(() => loggerErrorSpy.mockRestore());
  restoreFns.push(() => loggerWarnSpy.mockRestore());

  try {
    return await run();
  } finally {
    for (const restore of restoreFns) {
      restore();
    }
  }
}

export {
  createDefaultAccountGet,
  defaultAccountGet,
  type AuthIntegrationAccountGetResult,
} from './mockAccount.js';
export { IntegrationTestNoopCategoryService } from './mockOrm.js';
