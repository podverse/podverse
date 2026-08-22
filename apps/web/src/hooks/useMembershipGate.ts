import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { getContactEmail } from '../constants/contact';
import { useModals } from '../contexts/Modals';
import type { Membership403FeatureContext } from '../utils/membership/modalForMembership403';
import { getMembership403ModalProps } from '../utils/membership/modalForMembership403';

/**
 * Centralized web membership-gate handler (Track 19.4 — parity with mobile `useMembershipGate`).
 *
 * A logged-in but expired/insufficient user attempting a member-only action gets a `membership.*`
 * 403 (detected by the shared `parseMembershipGateError`). This hook turns that into the consistent
 * membership modal (message + auth-based Renew → `renewPath`) via the existing `modalLoginRequired`
 * slot, instead of a raw error/toast. Logged-out users are still handled by each caller's existing
 * login-required guard *before* the API call — this hook only handles logged-in denials in `catch`.
 *
 * Returns `true` when it opened the membership modal, so callers skip their generic error path.
 * Pass a `featureContext` only where bespoke copy exists (`directory_add_by_rss`, `manual_refresh`);
 * otherwise the default `generic` uses the shared expired / premium-required copy.
 */
export function useMembershipGate(): {
  tryHandleMembershipGateError: (
    error: unknown,
    options?: { featureContext?: Membership403FeatureContext }
  ) => boolean;
} {
  const tMembership = useTranslations('membership');
  const { setModalLoginRequired } = useModals();

  const tryHandleMembershipGateError = useCallback(
    (error: unknown, options?: { featureContext?: Membership403FeatureContext }): boolean => {
      const membershipModal = getMembership403ModalProps({
        error,
        contactEmail: getContactEmail(),
        featureContext: options?.featureContext ?? 'generic',
        tMembership,
      });
      if (membershipModal === null) {
        return false;
      }
      setModalLoginRequired(membershipModal);
      return true;
    },
    [setModalLoginRequired, tMembership]
  );

  return { tryHandleMembershipGateError };
}
