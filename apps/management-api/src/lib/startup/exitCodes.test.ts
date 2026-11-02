import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyPodverseTestEnv,
  buildPodverseManagementApiTestEnv,
  PODVERSE_STARTUP_VALIDATION_SILENT_ENV,
} from '@podverse/helpers-config';

import { EXIT_CODE_CONFIG_INVALID, exitOnStartupConfigInvalid } from './exitCodes.js';
import {
  ADMIN_SESSION_PURGE_COMMAND,
  getRequiredEnvKeys,
  validateStartupRequirements,
} from './validation.js';

describe('management-api startup config', () => {
  let envSnapshot: NodeJS.ProcessEnv;

  beforeEach(() => {
    envSnapshot = { ...process.env };
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = envSnapshot;
    vi.restoreAllMocks();
  });

  it('exits 78 when startup validation finds a missing required env var', () => {
    process.env = { ...PODVERSE_STARTUP_VALIDATION_SILENT_ENV };
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${String(code)})`);
    });

    expect(() => exitOnStartupConfigInvalid(() => validateStartupRequirements())).toThrow(
      'process.exit(78)'
    );
    expect(exit).toHaveBeenCalledWith(EXIT_CODE_CONFIG_INVALID);
  });

  it('does not exit when startup validation passes', () => {
    applyPodverseTestEnv(buildPodverseManagementApiTestEnv({ profile: 'managementApiVitest' }));
    applyPodverseTestEnv(PODVERSE_STARTUP_VALIDATION_SILENT_ENV);
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${String(code)})`);
    });

    exitOnStartupConfigInvalid(() => validateStartupRequirements());
    expect(exit).not.toHaveBeenCalled();
  });

  it('requires KeyValDB to serve the API but not to purge admin sessions', () => {
    expect(getRequiredEnvKeys({})).toContain('KEYVALDB_PASSWORD');
    expect(getRequiredEnvKeys({}, ADMIN_SESSION_PURGE_COMMAND)).not.toContain('KEYVALDB_PASSWORD');
  });
});
