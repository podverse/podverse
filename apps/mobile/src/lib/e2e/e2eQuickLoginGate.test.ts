import { describe, expect, it } from 'vitest';

import { isE2eQuickLoginEnabled } from './e2eQuickLoginGate';

describe('isE2eQuickLoginEnabled', () => {
  it('is on only for a dev build that is also an E2E Metro session', () => {
    expect(isE2eQuickLoginEnabled({ isDev: true, isE2e: true })).toBe(true);
  });

  it('stays off for a normal local Metro session', () => {
    expect(isE2eQuickLoginEnabled({ isDev: true, isE2e: false })).toBe(false);
  });

  it('stays off for a release build even if the E2E flag is set', () => {
    expect(isE2eQuickLoginEnabled({ isDev: false, isE2e: true })).toBe(false);
    expect(isE2eQuickLoginEnabled({ isDev: false, isE2e: false })).toBe(false);
  });
});
