import { describe, expect, it } from 'vitest';

import {
  LOCAL_DEV_LOGIN_EMAIL,
  LOCAL_DEV_LOGIN_PASSWORD,
  resolveLocalDevLoginPrefill,
} from './localDevLoginPrefill';

describe('resolveLocalDevLoginPrefill', () => {
  it('returns local-premium credentials in normal local dev', () => {
    expect(resolveLocalDevLoginPrefill({ isDev: true, isE2e: false })).toEqual({
      email: LOCAL_DEV_LOGIN_EMAIL,
      password: LOCAL_DEV_LOGIN_PASSWORD,
    });
  });

  it('returns null for production-like builds', () => {
    expect(resolveLocalDevLoginPrefill({ isDev: false, isE2e: false })).toBeNull();
  });

  it('returns null when E2E mode is on (Maestro types credentials)', () => {
    expect(resolveLocalDevLoginPrefill({ isDev: true, isE2e: true })).toBeNull();
  });
});
