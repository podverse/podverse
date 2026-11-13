import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import type { AccessDenialReason } from '@podverse/helpers';
import { parseAddByRssFeedLimitRefusal } from '@podverse/helpers-requests';

import { useAuthPrompt } from '../auth/AuthPromptContext';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { getMobileConfig } from '../config';
import { mapMembershipDenial } from './membershipDenial';
import {
  membershipGateConfirmDestination,
  membershipGateConfirmLabelKey,
  membershipGateConfirmTestID,
  membershipGateConfirmVariant,
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
 * a consistent modal instead of a raw error, and that action routes to the Membership screen. The
 * host provides that navigation so this module never imports the navigator.
 *
 * Reasons are the shared `AccessDenialReason` from `@podverse/helpers`, so this modal and the
 * client-side `useAccessTier` checks describe a denial the same way.
 *
 * - `openGate(reason)` — show the modal when the user attempts a gated action. `needs_account`
 *   confirms to Login. Every other reason confirms to the Membership screen. The confirm label is
 *   Sign Up when signed out, Buy Membership when the signed-in tier is not Premium, and Extend
 *   Membership when the tier is Premium.
 * - `handleGateError(error)` — if `error` is a membership 403, open the gate and return `true`;
 *   otherwise return `false` so callers fall through to their normal error handling. A server 403
 *   never yields `needs_account`.
 * - An Add by RSS feed-limit refusal opens its own dialog with the limit and an Email Support
 *   action instead of the Membership gate.
 * - `runGated(action)` — await an API action; a membership 403 opens the gate (returns `undefined`),
 *   any other error rethrows.
 * - `goToMembership()` — navigate to the Membership screen, so gated affordances anywhere in the app
 *   get that route without each screen wiring navigation.
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
  const membership = useMembership();
  const [gate, setGate] = useState<GatePresentation>({
    reason: 'needs_account',
    visible: false,
  });
  const [feedLimitGate, setFeedLimitGate] = useState<{ limit: number; visible: boolean }>({
    limit: 0,
    visible: false,
  });

  const openGate = useCallback((next: AccessDenialReason) => {
    setGate({ reason: next, visible: true });
  }, []);

  const closeGate = useCallback(() => {
    setGate((current) => ({ ...current, visible: false }));
  }, []);

  const closeFeedLimitGate = useCallback(() => {
    setFeedLimitGate((current) => ({ ...current, visible: false }));
  }, []);

  const handleGateError = useCallback((error: unknown): boolean => {
    const feedLimitRefusal = parseAddByRssFeedLimitRefusal(error);
    if (feedLimitRefusal !== null) {
      setFeedLimitGate({ limit: feedLimitRefusal.limit, visible: true });
      return true;
    }

    const denial = mapMembershipDenial(error);
    if (denial === null) {
      return false;
    }
    setGate({ reason: denial.reason, visible: true });
    return true;
  }, []);

  const onEmailSupport = useCallback(() => {
    closeFeedLimitGate();
    void Linking.openURL(`mailto:${getMobileConfig().contactEmail}`);
  }, [closeFeedLimitGate]);

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

  const messageKeys = membershipGateMessageKeys(gate.reason, membership.tier);
  const confirmLabel = t(membershipGateConfirmLabelKey(gate.reason, membership));

  return (
    <MembershipGateContext.Provider value={value}>
      {children}
      <ConfirmDialog
        body={t(messageKeys.bodyKey)}
        cancelLabel={t('membership.gate.cancel')}
        cancelTestID="premium-gate-cancel"
        confirmLabel={confirmLabel}
        confirmTestID={membershipGateConfirmTestID(gate.reason)}
        confirmVariant={membershipGateConfirmVariant(gate.reason, membership)}
        onCancel={closeGate}
        onConfirm={onConfirm}
        testID="premium-gate-modal"
        title={t(messageKeys.titleKey)}
        visible={gate.visible}
      />
      <ConfirmDialog
        body={t('membership.add_by_rss_feed_limit_reached', {
          contactEmail: getMobileConfig().contactEmail,
          limit: feedLimitGate.limit,
        })}
        cancelLabel={t('misc.close')}
        cancelTestID="add-by-rss-feed-limit-close"
        confirmLabel={t('membership.gate.email_support')}
        confirmTestID="add-by-rss-feed-limit-email-support"
        onCancel={closeFeedLimitGate}
        onConfirm={onEmailSupport}
        testID="add-by-rss-feed-limit-modal"
        title={t('membership.gate.title_limit')}
        visible={feedLimitGate.visible}
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
