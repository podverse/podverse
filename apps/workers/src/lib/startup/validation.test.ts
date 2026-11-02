import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { validateStartupRequirements } from './validation.js';

const CREDENTIALS_KEY = 'ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY';

const missingRequiredMessage =
  'FATAL: 1 required environment variable(s) are missing or invalid. Please check the validation output above for details.';

/** Env that satisfies every workers category except the Add by RSS transit key. */
const startupEnv = (): Record<string, string> => ({
  USER_AGENT: 'Example Bot test/Workers/5',
  LOG_LEVEL: 'error',
  OTEL_SERVICE_NAME: 'podverse-workers',
  OTEL_TRACES_EXPORT: 'none',
  DB_HOST: '127.0.0.1',
  DB_PORT: '5732',
  DB_APP_NAME: 'podverse_app_test',
  DB_APP_READ_USER: 'podverse_app_read',
  DB_APP_READ_PASSWORD: 'test',
  DB_APP_READ_WRITE_USER: 'podverse_app_read_write',
  DB_APP_READ_WRITE_PASSWORD: 'test',
  DEFAULT_ACCOUNT_SETTINGS_LOCALE: 'en',
  MESSAGE_QUEUE_PROTOCOL: 'tcp',
  MESSAGE_QUEUE_HOST: 'localhost',
  MESSAGE_QUEUE_USERNAME: 'test',
  MESSAGE_QUEUE_PASSWORD: 'test',
  MESSAGE_QUEUE_PORT: '61616',
  KEYVALDB_HOST: '127.0.0.1',
  KEYVALDB_PORT: '6679',
  KEYVALDB_PASSWORD: 'test',
  KEYVALDB_CACHE_EXPIRATION: '86400',
  PODCAST_INDEX_BASE_URL: 'https://api.podcastindex.org/api/1.8.1',
  PODCAST_INDEX_DUPLICATE_MERGE_MODE: 'off',
  PODCAST_INDEX_DEAD_FEED_RETIRE_MODE: 'off',
  PODCAST_INDEX_AUTH_KEY: 'test',
  PODCAST_INDEX_SECRET_KEY: 'test',
  WEB_PROTOCOL: 'http',
  WEB_DOMAIN: 'localhost',
  BRAND_NAME: 'PodverseTest',
});

const snapshotProcessEnv = (): Record<string, string | undefined> => ({ ...process.env });

const restoreProcessEnv = (snapshot: Record<string, string | undefined>): void => {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

const installEnv = (values: Record<string, string>): void => {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
};

const consoleErrorText = (): string =>
  vi
    .mocked(console.error)
    .mock.calls.map((call) => call.map((part) => String(part)).join(' '))
    .join('\n');

const expectStartupSucceeds = (commandName: string): void => {
  try {
    validateStartupRequirements(commandName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${commandName}: ${message}`, { cause: error });
  }
};

describe('Add by RSS credential key validation', () => {
  let envSnapshot: Record<string, string | undefined>;

  beforeEach(() => {
    envSnapshot = snapshotProcessEnv();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    restoreProcessEnv(envSnapshot);
    vi.restoreAllMocks();
  });

  it('validates purge commands without the Add by RSS key', () => {
    installEnv(startupEnv());
    for (const commandName of [
      'accountContentLogPurge',
      'accountSessionPurge',
      'notificationsPlatformPurge',
    ]) {
      expectStartupSucceeds(commandName);
    }
    expect(consoleErrorText()).not.toContain(`${CREDENTIALS_KEY} (required)`);
  });

  it('validates the public RSS parser without the Add by RSS key', () => {
    installEnv(startupEnv());
    expectStartupSucceeds('mqRSSRunParser');
    expect(consoleErrorText()).not.toContain(`${CREDENTIALS_KEY} (required)`);
  });

  it('rejects mqAddByRSSRunParser when the Add by RSS key is missing', () => {
    installEnv(startupEnv());
    expect(() => validateStartupRequirements('mqAddByRSSRunParser')).toThrow(
      missingRequiredMessage
    );
    expect(consoleErrorText()).toContain(`${CREDENTIALS_KEY} (required)`);
    expect(consoleErrorText()).not.toContain(`${CREDENTIALS_KEY}_OLD`);
  });

  it('accepts mqAddByRSSRunParser when the key is set', () => {
    installEnv({
      ...startupEnv(),
      [CREDENTIALS_KEY]: '0123456789abcdef'.repeat(4),
    });
    expectStartupSucceeds('mqAddByRSSRunParser');
    expect(consoleErrorText()).not.toContain(`${CREDENTIALS_KEY} (required)`);
  });
});
