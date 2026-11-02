import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assertStartupConfig,
  EXIT_CODE_CONFIG_INVALID,
  exitOnStartupConfigInvalid,
  StartupConfigInvalidError,
} from './exitCodes.js';
import { validateStartupRequirements } from './validation.js';

describe('startup config exit code', () => {
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
    process.env = {};
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${String(code)})`);
    });

    expect(() =>
      exitOnStartupConfigInvalid(() => validateStartupRequirements('accountSessionPurge'))
    ).toThrow('process.exit(78)');
    expect(exit).toHaveBeenCalledWith(EXIT_CODE_CONFIG_INVALID);
  });

  it('does not exit when validation passes', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${String(code)})`);
    });

    exitOnStartupConfigInvalid(() => undefined);
    expect(exit).not.toHaveBeenCalled();
  });

  it('marks a failed module config check as a startup config error', () => {
    expect(() =>
      assertStartupConfig(() => {
        throw new Error('FATAL: podverse-orm validation failed');
      })
    ).toThrow(StartupConfigInvalidError);
  });
});
