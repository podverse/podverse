import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PremiumGateModal } from '../components/feedback/PremiumGateModal';
import type { MembershipDenialReason } from './membershipDenial';
import { mapMembershipDenial } from './membershipDenial';
import { useMembership } from './useMembership';

/**
 * App-wide premium membership gate (Track 19.4). Member-only actions stay visible; on a
 * `membership.*` 403 the app shows a consistent modal (Cancel + auth-based Renew/Sign Up) instead of
 * a raw error, and Renew/Sign Up routes to the Membership screen (the host provides that navigation
 * so this module never imports the navigator — avoids an import cycle).
 *
 * - `openGate(reason)` — show the modal directly (e.g. a pre-known gate).
 * - `handleGateError(error)` — if `error` is a membership 403, open the gate and return `true`;
 *   otherwise return `false` so callers fall through to their normal error handling. Uses the shared
 *   `parseMembershipGateError` detector (via `mapMembershipDenial`) — the same one web uses.
 * - `runGated(action)` — await an API action; a membership 403 opens the gate (returns `undefined`),
 *   any other error rethrows.
 */
export type MembershipGateContextValue = {
  openGate: (reason: MembershipDenialReason) => void;
  handleGateError: (error: unknown) => boolean;
  runGated: <T>(action: () => Promise<T>) => Promise<T | undefined>;
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
  const [reason, setReason] = useState<MembershipDenialReason | null>(null);

  const openGate = useCallback((next: MembershipDenialReason) => {
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
    () => ({ handleGateError, openGate, runGated }),
    [handleGateError, openGate, runGated]
  );

  const title =
    reason === 'insufficient_tier'
      ? t('membership.gate.title_premium')
      : reason === 'limit'
        ? t('membership.gate.title_limit')
        : t('membership.gate.title_expired');
  const body =
    reason === 'insufficient_tier'
      ? t('membership.gate.body_premium')
      : reason === 'limit'
        ? t('membership.gate.body_limit')
        : t('membership.gate.body_expired');
  const confirmLabel = isLoggedIn ? t('membership.gate.renew') : t('membership.gate.sign_up');

  return (
    <MembershipGateContext.Provider value={value}>
      {children}
      <PremiumGateModal
        body={body}
        cancelLabel={t('membership.gate.cancel')}
        confirmLabel={confirmLabel}
        onCancel={closeGate}
        onConfirm={onConfirm}
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
