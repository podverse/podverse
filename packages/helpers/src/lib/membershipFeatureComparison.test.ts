import { describe, expect, it } from 'vitest';

import type { MembershipComparisonNameKey } from './membershipFeatureComparison.js';
import {
  MEMBERSHIP_COMPARISON_FEATURES,
  membershipComparisonIsMobileOnly,
} from './membershipFeatureComparison.js';

function featureNamed(nameKey: MembershipComparisonNameKey) {
  const feature = MEMBERSHIP_COMPARISON_FEATURES.find((row) => row.nameKey === nameKey);
  if (feature === undefined) {
    throw new Error(`Missing comparison feature ${nameKey}`);
  }
  return feature;
}

describe('membershipComparisonIsMobileOnly', () => {
  it('marks rows that have a mobile-only available check, and not coming-soon or web-available rows', () => {
    expect(membershipComparisonIsMobileOnly(featureNamed('download'))).toBe(true);
    expect(membershipComparisonIsMobileOnly(featureNamed('subscribe'))).toBe(true);
    expect(membershipComparisonIsMobileOnly(featureNamed('notifications'))).toBe(true);
    expect(membershipComparisonIsMobileOnly(featureNamed('video'))).toBe(false);
    expect(
      membershipComparisonIsMobileOnly({
        nameKey: 'comments',
        free: false,
        premium: false,
        comingSoon: true,
      })
    ).toBe(false);
  });
});
