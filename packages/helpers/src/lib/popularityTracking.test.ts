import { describe, expect, it } from 'vitest';

import {
  isPopularityTrackingAllowed,
  isPopularityTrackingPromptRequired,
} from './popularityTracking.js';

const current = '2026-09-11';

describe('isPopularityTrackingAllowed', () => {
  it('is false when there is no decision', () => {
    expect(isPopularityTrackingAllowed(null, current)).toBe(false);
    expect(isPopularityTrackingAllowed(undefined, current)).toBe(false);
    expect(
      isPopularityTrackingAllowed(
        { listen_stats_accepted: null, listen_stats_agreement_version: null },
        current
      )
    ).toBe(false);
  });

  it('is false when the user declined', () => {
    expect(
      isPopularityTrackingAllowed(
        { listen_stats_accepted: false, listen_stats_agreement_version: current },
        current
      )
    ).toBe(false);
  });

  it('is false when the accepted version is stale', () => {
    expect(
      isPopularityTrackingAllowed(
        { listen_stats_accepted: true, listen_stats_agreement_version: '2026-01-01' },
        current
      )
    ).toBe(false);
  });

  it('is true only for accept of the current version', () => {
    expect(
      isPopularityTrackingAllowed(
        { listen_stats_accepted: true, listen_stats_agreement_version: current },
        current
      )
    ).toBe(true);
  });
});

describe('isPopularityTrackingPromptRequired', () => {
  it('is required when never decided', () => {
    expect(isPopularityTrackingPromptRequired(null, current)).toBe(true);
    expect(
      isPopularityTrackingPromptRequired(
        { listen_stats_accepted: null, listen_stats_agreement_version: null },
        current
      )
    ).toBe(true);
  });

  it('is required when an accepted user is on a stale version', () => {
    expect(
      isPopularityTrackingPromptRequired(
        { listen_stats_accepted: true, listen_stats_agreement_version: '2026-01-01' },
        current
      )
    ).toBe(true);
  });

  it('is not required after a decline, even if the version changed', () => {
    expect(
      isPopularityTrackingPromptRequired(
        { listen_stats_accepted: false, listen_stats_agreement_version: '2026-01-01' },
        current
      )
    ).toBe(false);
  });

  it('is not required after accept of the current version', () => {
    expect(
      isPopularityTrackingPromptRequired(
        { listen_stats_accepted: true, listen_stats_agreement_version: current },
        current
      )
    ).toBe(false);
  });
});
