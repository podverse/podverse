import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyPodverseTestEnv,
  buildPodverseManagementApiTestEnv,
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

  it('managementApiVitest profile passes management-api startup validation', () => {
    applyPodverseTestEnv(buildPodverseManagementApiTestEnv({ profile: 'managementApiVitest' }));
    expect(() => validateStartupRequirements()).not.toThrow();
  });

  it('managementApiE2e bucket-off profile passes management-api startup validation', () => {
    applyPodverseTestEnv(
      buildPodverseManagementApiTestEnv({ profile: 'managementApiE2e', bucketMode: 'off' })
    );
    expect(() => validateStartupRequirements()).not.toThrow();
  });

  it('managementApiE2e fake-aws profile passes management-api startup validation', () => {
    applyPodverseTestEnv(
      buildPodverseManagementApiTestEnv({ profile: 'managementApiE2e', bucketMode: 'fakeAws' })
    );
    expect(() => validateStartupRequirements()).not.toThrow();
  });
});
