import { describe, expect, it } from 'vitest';

import { resolveManagementProbeChromePhase } from './managementProbeChromeGate';

describe('resolveManagementProbeChromePhase', () => {
  it('returns spinner while loading', () => {
    expect(
      resolveManagementProbeChromePhase({
        loading: true,
        probingExistence: false,
        bypassWhileError: false,
      })
    ).toBe('spinner');
    expect(
      resolveManagementProbeChromePhase({
        loading: true,
        probingExistence: true,
        bypassWhileError: true,
      })
    ).toBe('spinner');
  });

  it('returns content when bypassWhileError despite probing', () => {
    expect(
      resolveManagementProbeChromePhase({
        loading: false,
        probingExistence: true,
        bypassWhileError: true,
      })
    ).toBe('content');
  });

  it('returns spinner when probing and not bypassing', () => {
    expect(
      resolveManagementProbeChromePhase({
        loading: false,
        probingExistence: true,
        bypassWhileError: false,
      })
    ).toBe('spinner');
  });

  it('returns content when idle', () => {
    expect(
      resolveManagementProbeChromePhase({
        loading: false,
        probingExistence: false,
        bypassWhileError: false,
      })
    ).toBe('content');
  });
});
