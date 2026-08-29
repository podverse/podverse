import { useCallback, useMemo } from 'react';

import type { AccessTier, FeatureAccess, GatedFeature } from '@podverse/helpers';
import { accessTierFromMembership, evaluateFeatureAccess } from '@podverse/helpers';

import { useMembership } from './useMembership';

export type AccessTierState = {
  /** The user's current tier. A lapsed member reports `account`, never a fourth state. */
  tier: AccessTier;
  /** Full result, including the denial reason, for rendering a gated affordance. */
  evaluateFeature: (feature: GatedFeature) => FeatureAccess;
  /** Shorthand for guard clauses that do not need the reason. */
  canUse: (feature: GatedFeature) => boolean;
};

/**
 * The mobile reader for the shared access-tier model in `@podverse/helpers`. Screens ask this what a
 * user may do rather than deriving it from `useAuth().status` plus membership fields, which cannot
 * express the difference between "needs an account" and "needs a membership".
 *
 * This answers *before* a request. `useMembershipGate().handleGateError` handles the server's answer
 * *after* one, and both report the same `AccessDenialReason`.
 */
export const useAccessTier = (): AccessTierState => {
  const membership = useMembership();

  const tier = useMemo(() => accessTierFromMembership(membership), [membership]);

  const evaluateFeature = useCallback(
    (feature: GatedFeature): FeatureAccess => evaluateFeatureAccess(feature, membership),
    [membership]
  );

  const canUse = useCallback(
    (feature: GatedFeature): boolean => evaluateFeatureAccess(feature, membership).allowed,
    [membership]
  );

  return { canUse, evaluateFeature, tier };
};
