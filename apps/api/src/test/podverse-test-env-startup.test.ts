import { loggerService } from '@api/factories/loggerService.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POPULARITY_DEFAULT_ALL_TIME_RECOUNT_DAYS } from '@podverse/helpers';
import {
  applyPodverseTestEnv,
  buildPodverseApiTestEnv,
  PODVERSE_STARTUP_VALIDATION_SILENT_ENV,
} from '@podverse/helpers-config';

import { validateStartupRequirements } from '../lib/startup/validation.js';

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

const startupFailureMessage =
  'FATAL: 1 environment variable(s) failed validation. Please check the validation output above for details.';

/** Assert the rejection and keep its report off the test reporter. */
const expectStartupToRejectRecountWindow = (recountDays: number, retentionDays: number): void => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const loggerError = vi.spyOn(loggerService, 'error').mockImplementation(() => undefined);
  try {
    expect(() => validateStartupRequirements()).toThrow(startupFailureMessage);
    const printed = consoleError.mock.calls
      .map((call) => call.map((part) => String(part)).join(' '))
      .join('\n');
    const detail =
      `STATS_ALL_TIME_RECOUNT_DAYS (${recountDays}) is greater than ` +
      `STATS_TRACK_EVENT_RETENTION_DAYS (${retentionDays})`;
    expect(printed).toContain(detail);
    expect(loggerError).toHaveBeenCalledWith(startupFailureMessage);
  } finally {
    consoleError.mockRestore();
    loggerError.mockRestore();
  }
};

const expectStartupToRejectPlaylistTagEnv = (envName: string): void => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const loggerError = vi.spyOn(loggerService, 'error').mockImplementation(() => undefined);
  try {
    expect(() => validateStartupRequirements()).toThrow(startupFailureMessage);
    const printed = consoleError.mock.calls
      .map((call) => call.map((part) => String(part)).join(' '))
      .join('\n');
    expect(printed).toContain(envName);
    expect(loggerError).toHaveBeenCalledWith(startupFailureMessage);
  } finally {
    consoleError.mockRestore();
    loggerError.mockRestore();
  }
};

describe('podverse test env startup validation', () => {
  let envSnapshot: Record<string, string | undefined>;

  beforeEach(() => {
    envSnapshot = snapshotProcessEnv();
    applyPodverseTestEnv(PODVERSE_STARTUP_VALIDATION_SILENT_ENV);
  });

  afterEach(() => {
    restoreProcessEnv(envSnapshot);
  });

  it('apiVitest profile passes API startup validation', () => {
    applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiVitest' }));
    expect(() => validateStartupRequirements()).not.toThrow();
  });

  it('apiWebE2e profile passes API startup validation', () => {
    applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiWebE2e' }));
    expect(() => validateStartupRequirements()).not.toThrow();
  });

  it('fails startup when STATS_ALL_TIME_RECOUNT_DAYS is greater than STATS_TRACK_EVENT_RETENTION_DAYS', () => {
    applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiVitest' }));
    process.env.STATS_TRACK_EVENT_RETENTION_DAYS = '60';
    process.env.STATS_ALL_TIME_RECOUNT_DAYS = '61';
    expectStartupToRejectRecountWindow(61, 60);
  });

  it('fails startup when only the retention is lowered below the default recount period', () => {
    applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiVitest' }));
    process.env.STATS_TRACK_EVENT_RETENTION_DAYS = '60';
    delete process.env.STATS_ALL_TIME_RECOUNT_DAYS;
    expectStartupToRejectRecountWindow(POPULARITY_DEFAULT_ALL_TIME_RECOUNT_DAYS, 60);
  });

  it('passes startup when STATS_ALL_TIME_RECOUNT_DAYS equals STATS_TRACK_EVENT_RETENTION_DAYS', () => {
    applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiVitest' }));
    process.env.STATS_TRACK_EVENT_RETENTION_DAYS = '60';
    process.env.STATS_ALL_TIME_RECOUNT_DAYS = '60';
    expect(() => validateStartupRequirements()).not.toThrow();
  });

  it('passes startup when both playlist tag limits are unset', () => {
    applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiVitest' }));
    delete process.env.PLAYLIST_TAG_MAX_PER_PLAYLIST;
    delete process.env.PLAYLIST_TAG_NAME_MAX_LENGTH;
    expect(() => validateStartupRequirements()).not.toThrow();
  });

  it('fails startup when PLAYLIST_TAG_NAME_MAX_LENGTH is above 50', () => {
    applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiVitest' }));
    process.env.PLAYLIST_TAG_NAME_MAX_LENGTH = '51';
    expectStartupToRejectPlaylistTagEnv('PLAYLIST_TAG_NAME_MAX_LENGTH');
  });

  it('passes startup when PLAYLIST_TAG_NAME_MAX_LENGTH is 50', () => {
    applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiVitest' }));
    process.env.PLAYLIST_TAG_NAME_MAX_LENGTH = '50';
    expect(() => validateStartupRequirements()).not.toThrow();
  });

  it('fails startup when PLAYLIST_TAG_NAME_MAX_LENGTH is 0', () => {
    applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiVitest' }));
    process.env.PLAYLIST_TAG_NAME_MAX_LENGTH = '0';
    expectStartupToRejectPlaylistTagEnv('PLAYLIST_TAG_NAME_MAX_LENGTH');
  });

  it('fails startup when PLAYLIST_TAG_NAME_MAX_LENGTH is not an integer', () => {
    applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiVitest' }));
    process.env.PLAYLIST_TAG_NAME_MAX_LENGTH = 'abc';
    expectStartupToRejectPlaylistTagEnv('PLAYLIST_TAG_NAME_MAX_LENGTH');
  });

  it('passes startup when PLAYLIST_TAG_MAX_PER_PLAYLIST is 8', () => {
    applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiVitest' }));
    process.env.PLAYLIST_TAG_MAX_PER_PLAYLIST = '8';
    expect(() => validateStartupRequirements()).not.toThrow();
  });

  it('fails startup when PLAYLIST_TAG_MAX_PER_PLAYLIST is 0', () => {
    applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiVitest' }));
    process.env.PLAYLIST_TAG_MAX_PER_PLAYLIST = '0';
    expectStartupToRejectPlaylistTagEnv('PLAYLIST_TAG_MAX_PER_PLAYLIST');
  });

  it('fails startup when PLAYLIST_TAG_MAX_PER_PLAYLIST is above 32767', () => {
    applyPodverseTestEnv(buildPodverseApiTestEnv({ profile: 'apiVitest' }));
    process.env.PLAYLIST_TAG_MAX_PER_PLAYLIST = '32768';
    expectStartupToRejectPlaylistTagEnv('PLAYLIST_TAG_MAX_PER_PLAYLIST');
  });

  it('turns off both botted-listener signals in the web and mobile E2E API profiles', () => {
    for (const profile of ['apiWebE2e', 'apiMobileE2e'] as const) {
      const env = buildPodverseApiTestEnv({ profile });
      expect(env.STATS_FLAG_TOO_SOON_MINUTES).toBe('0');
      expect(env.STATS_FLAG_STORED_CAP_WITHIN_HOURS).toBe('0');
    }
  });
});
