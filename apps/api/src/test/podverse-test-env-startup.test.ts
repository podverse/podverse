import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
});
