import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import type { AccessTier, FeatureAccess, GatedFeature } from '@podverse/helpers';
import {
  accessTierFromMembership,
  deriveMembershipState,
  evaluateFeatureAccess,
} from '@podverse/helpers';

import { useAccount } from '../contexts/Account';
import { useConfig } from '../contexts/Config';
import { useModals } from '../contexts/Modals';
import type { Membership403FeatureContext } from '../utils/membership/modalForMembership403';
import { getMembership403ModalProps } from '../utils/membership/modalForMembership403';

/**
 * Centralized web membership gate, resolving both halves of gating through the shared access-tier
 * model in `@podverse/helpers` so web and mobile cannot drift.
 *
 * - `accessTier` / `evaluateFeature` answer "can this user do this" *before* a request, using the
 *   same tier table mobile uses, so a call site does not have to re-derive gating from auth state
 *   plus membership fields. A caller may still keep its own `loggedInAccount` login guard.
 * - `tryHandleMembershipGateError` handles the denial *after* a request: a logged-in user gets the
 *   consistent membership modal (message, plus Buy Membership or Extend Membership from tier,
 *   linking through `renewPath`) through the `modalLoginRequired` slot instead of a raw error.
 *   Returns `true` when it opened the modal, so callers skip their generic error path.
 *
 * Pass a `featureContext` only where bespoke copy exists (`directory_add_by_rss`, `manual_refresh`);
 * otherwise the default `generic` uses the shared expired / premium-required copy.
 */
export function useMembershipGate(): {
  accessTier: AccessTier;
  evaluateFeature: (feature: GatedFeature) => FeatureAccess;
  tryHandleMembershipGateError: (
    error: unknown,
    options?: { featureContext?: Membership403FeatureContext }
  ) => boolean;
} {
  const tMembership = useTranslations('membership');
  const { setModalLoginRequired } = useModals();
  const { loggedInAccount } = useAccount();
  const contactEmail = useConfig().public.contact.email;

  const membership = useMemo(() => deriveMembershipState(loggedInAccount), [loggedInAccount]);
  const accessTier = useMemo(() => accessTierFromMembership(membership), [membership]);

  const evaluateFeature = useCallback(
    (feature: GatedFeature): FeatureAccess => evaluateFeatureAccess(feature, membership),
    [membership]
  );

  const tryHandleMembershipGateError = useCallback(
    (error: unknown, options?: { featureContext?: Membership403FeatureContext }): boolean => {
      const membershipModal = getMembership403ModalProps({
        error,
        contactEmail,
        featureContext: options?.featureContext ?? 'generic',
        membership,
        tMembership,
      });
      if (membershipModal === null) {
        return false;
      }
      setModalLoginRequired(membershipModal);
      return true;
    },
    [contactEmail, membership, setModalLoginRequired, tMembership]
  );

  return { accessTier, evaluateFeature, tryHandleMembershipGateError };
}
