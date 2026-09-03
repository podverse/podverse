import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AccessDenialReason } from '@podverse/helpers';

import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { mapMembershipDenial } from './membershipDenial';
import { useMembership } from './useMembership';

/**
 * App-wide membership gate. Member-only actions stay visible; on a `membership.*` 403 the app shows
 * a consistent modal (Cancel + auth-based Renew/Sign Up) instead of a raw error, and Renew/Sign Up
 * routes to the Membership screen (the host provides that navigation so this module never imports
 * the navigator — avoids an import cycle).
 *
 * Reasons are the shared `AccessDenialReason` from `@podverse/helpers`, so this modal and the
 * client-side `useAccessTier` checks describe a denial the same way.
 *
 * - `openGate(reason)` — show the modal directly, for a denial the client already resolved.
 * - `handleGateError(error)` — if `error` is a membership 403, open the gate and return `true`;
 *   otherwise return `false` so callers fall through to their normal error handling. A server 403
 *   never yields `needs_account`.
 * - `runGated(action)` — await an API action; a membership 403 opens the gate (returns `undefined`),
 *   any other error rethrows.
 * - `goToMembership()` — navigate to the Membership screen, so gated affordances anywhere in the app
 *   get the renewal route without each screen wiring navigation.
 */
export type MembershipGateContextValue = {
  openGate: (reason: AccessDenialReason) => void;
  handleGateError: (error: unknown) => boolean;
  runGated: <T>(action: () => Promise<T>) => Promise<T | undefined>;
  goToMembership: () => void;
};

const MembershipGateContext = createContext<MembershipGateContextValue | undefined>(undefined);

type MembershipGateProviderProps = PropsWithChildren<{
  onNavigateToMembership: () => void;
}>;

export function MembershipGateProvider({
  children,
  onNavigateToMembership,
}: MembershipGateProviderProps) {
  const { t } = useTranslation();
  const { isLoggedIn } = useMembership();
  const [reason, setReason] = useState<AccessDenialReason | null>(null);

  const openGate = useCallback((next: AccessDenialReason) => {
    setReason(next);
  }, []);

  const closeGate = useCallback(() => {
    setReason(null);
  }, []);

  const handleGateError = useCallback((error: unknown): boolean => {
    const denial = mapMembershipDenial(error);
    if (denial === null) {
      return false;
    }
    setReason(denial.reason);
    return true;
  }, []);

  const runGated = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await action();
      } catch (error) {
        if (handleGateError(error)) {
          return undefined;
        }
        throw error;
      }
    },
    [handleGateError]
  );

  const onConfirm = useCallback(() => {
    closeGate();
    onNavigateToMembership();
  }, [closeGate, onNavigateToMembership]);

  const value = useMemo<MembershipGateContextValue>(
    () => ({ goToMembership: onNavigateToMembership, handleGateError, openGate, runGated }),
    [handleGateError, onNavigateToMembership, openGate, runGated]
  );

  const title =
    reason === 'needs_membership'
      ? t('membership.gate.title_premium')
      : reason === 'limit_reached'
        ? t('membership.gate.title_limit')
        : reason === 'needs_account'
          ? t('membership.gate.title_needs_account')
          : t('membership.gate.title_expired');
  const body =
    reason === 'needs_membership'
      ? t('membership.gate.body_premium')
      : reason === 'limit_reached'
        ? t('membership.gate.body_limit')
        : reason === 'needs_account'
          ? t('membership.gate.body_needs_account')
          : t('membership.gate.body_expired');
  const confirmLabel = isLoggedIn ? t('membership.gate.renew') : t('membership.gate.sign_up');

  return (
    <MembershipGateContext.Provider value={value}>
      {children}
      <ConfirmDialog
        body={body}
        cancelLabel={t('membership.gate.cancel')}
        cancelTestID="premium-gate-cancel"
        confirmLabel={confirmLabel}
        confirmTestID="premium-gate-renew"
        onCancel={closeGate}
        onConfirm={onConfirm}
        testID="premium-gate-modal"
        title={title}
        visible={reason !== null}
      />
    </MembershipGateContext.Provider>
  );
}

export const useMembershipGate = (): MembershipGateContextValue => {
  const context = useContext(MembershipGateContext);

  if (context === undefined) {
    throw new Error('useMembershipGate must be used within MembershipGateProvider');
  }

  return context;
};
