import { describe, expect, it } from 'vitest';

import { shouldBlockAccountSync } from './shouldBlockAccountSync';

describe('shouldBlockAccountSync', () => {
  it('does not block when anonymous or unknown', () => {
    expect(
      shouldBlockAccountSync({
        accountPresent: false,
        agreementLoaded: false,
        loadFailed: false,
        status: 'anonymous',
        termsCurrent: false,
      })
    ).toBe(false);
    expect(
      shouldBlockAccountSync({
        accountPresent: false,
        agreementLoaded: false,
        loadFailed: false,
        status: 'unknown',
        termsCurrent: false,
      })
    ).toBe(false);
  });

  it('does not block authenticated sessions that still need an account snapshot', () => {
    expect(
      shouldBlockAccountSync({
        accountPresent: false,
        agreementLoaded: true,
        loadFailed: false,
        status: 'authenticated',
        termsCurrent: false,
      })
    ).toBe(false);
  });

  it('blocks while the terms document is still loading for a known account', () => {
    expect(
      shouldBlockAccountSync({
        accountPresent: true,
        agreementLoaded: false,
        loadFailed: false,
        status: 'authenticated',
        termsCurrent: false,
      })
    ).toBe(true);
  });

  it('blocks when the account has not accepted the current terms', () => {
    expect(
      shouldBlockAccountSync({
        accountPresent: true,
        agreementLoaded: true,
        loadFailed: false,
        status: 'authenticated',
        termsCurrent: false,
      })
    ).toBe(true);
  });

  it('blocks when the terms document failed to load', () => {
    expect(
      shouldBlockAccountSync({
        accountPresent: true,
        agreementLoaded: false,
        loadFailed: true,
        status: 'authenticated',
        termsCurrent: false,
      })
    ).toBe(true);
  });

  it('does not block when the account is current on terms', () => {
    expect(
      shouldBlockAccountSync({
        accountPresent: true,
        agreementLoaded: true,
        loadFailed: false,
        status: 'authenticated',
        termsCurrent: true,
      })
    ).toBe(false);
  });
});
