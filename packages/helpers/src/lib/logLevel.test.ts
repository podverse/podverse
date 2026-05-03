import { afterEach, describe, expect, it } from 'vitest';

import { isEnvLogLevelDebug, isLogLevelDebug } from './logLevel.js';

describe('isLogLevelDebug', () => {
  it('is true for debug with varied casing and whitespace', () => {
    expect(isLogLevelDebug('debug')).toBe(true);
    expect(isLogLevelDebug('DEBUG')).toBe(true);
    expect(isLogLevelDebug('  debug  ')).toBe(true);
  });

  it('is false for other levels and empty', () => {
    expect(isLogLevelDebug('info')).toBe(false);
    expect(isLogLevelDebug('verbose')).toBe(false);
    expect(isLogLevelDebug('')).toBe(false);
    expect(isLogLevelDebug('   ')).toBe(false);
    expect(isLogLevelDebug(undefined)).toBe(false);
    expect(isLogLevelDebug(null)).toBe(false);
  });
});

describe('isEnvLogLevelDebug', () => {
  const original = process.env.LOG_LEVEL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = original;
    }
  });

  it('reflects process.env.LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'debug';
    expect(isEnvLogLevelDebug()).toBe(true);
    process.env.LOG_LEVEL = 'error';
    expect(isEnvLogLevelDebug()).toBe(false);
    delete process.env.LOG_LEVEL;
    expect(isEnvLogLevelDebug()).toBe(false);
  });
});
