import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AccessDenialReason } from '@podverse/helpers';

import { useAuthPrompt } from '../auth/AuthPromptContext';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { mapMembershipDenial } from './membershipDenial';
import {
  membershipGateConfirmDestination,
  membershipGateConfirmLabelKey,
  membershipGateConfirmTestID,
  membershipGateMessageKeys,
} from './membershipGateCopy';
import { useMembership } from './useMembership';

type GatePresentation = {
  reason: AccessDenialReason;
  /** Hide without clearing `reason`, so fade-out cannot pick a different message. */
  visible: boolean;
};

/**
 * App-wide membership gate. Member-only actions stay visible; on a `membership.*` 403 the app shows
 * a consistent modal (Cancel + auth-based Renew/Sign Up) instead of a raw error, and Renew/Sign Up
 * routes to the Membership screen (the host provides that navigation so this module never imports
 * the navigator — avoids an import cycle).
 *
 * Reasons are the shared `AccessDenialReason` from `@podverse/helpers`, so this modal and the
 * client-side `useAccessTier` checks describe a denial the same way.
 *
 * - `openGate(reason)` — show the modal when the user attempts a gated action. `needs_account`
 *   confirms to Login; membership reasons confirm to the Membership screen.
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
  const { onRequestLogin } = useAuthPrompt();
  const { isLoggedIn } = useMembership();
  const [gate, setGate] = useState<GatePresentation>({
    reason: 'needs_account',
    visible: false,
  });

  const openGate = useCallback((next: AccessDenialReason) => {
    setGate({ reason: next, visible: true });
  }, []);

  const closeGate = useCallback(() => {
    setGate((current) => ({ ...current, visible: false }));
  }, []);

  const handleGateError = useCallback((error: unknown): boolean => {
    const denial = mapMembershipDenial(error);
    if (denial === null) {
      return false;
    }
    setGate({ reason: denial.reason, visible: true });
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
    const destination = membershipGateConfirmDestination(gate.reason);
    closeGate();
    switch (destination) {
      case 'login':
        onRequestLogin();
        return;
      case 'membership':
        onNavigateToMembership();
        return;
    }
  }, [closeGate, gate.reason, onNavigateToMembership, onRequestLogin]);

  const value = useMemo<MembershipGateContextValue>(
    () => ({ goToMembership: onNavigateToMembership, handleGateError, openGate, runGated }),
    [handleGateError, onNavigateToMembership, openGate, runGated]
  );

  const messageKeys = membershipGateMessageKeys(gate.reason);
  const confirmLabel = t(membershipGateConfirmLabelKey(gate.reason, isLoggedIn));

  return (
    <MembershipGateContext.Provider value={value}>
      {children}
      <ConfirmDialog
        body={t(messageKeys.bodyKey)}
        cancelLabel={t('membership.gate.cancel')}
        cancelTestID="premium-gate-cancel"
        confirmLabel={confirmLabel}
        confirmTestID={membershipGateConfirmTestID(gate.reason)}
        onCancel={closeGate}
        onConfirm={onConfirm}
        testID="premium-gate-modal"
        title={t(messageKeys.titleKey)}
        visible={gate.visible}
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
