'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { deriveMembershipState } from '@podverse/helpers';

import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';
import {
  getParsedLocalSettings,
  handleLocalSettingsUpdate,
} from '../../utils/localSettings/localSettings';
import { dismissToast, showToastCustom } from './Toast';

export function MembershipExpirationToast() {
  const { loggedInAccount } = useAccount();
  const t = useTranslations('membership');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const toastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!loggedInAccount) {
      if (toastIdRef.current) {
        dismissToast(toastIdRef.current);
        toastIdRef.current = null;
      }
      return;
    }

    const membership = deriveMembershipState(loggedInAccount);
    if (!membership.expiresAt) {
      if (toastIdRef.current) {
        dismissToast(toastIdRef.current);
        toastIdRef.current = null;
      }
      return;
    }

    const isFreeTrial = membership.tier === 'trial';
    const autoRenew = loggedInAccount.account_membership_status?.auto_renew || false;

    const expirationDate = new Date(membership.expiresAt);
    const now = new Date();
    const isExpired = membership.isExpired;
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isExpiringSoon = daysUntilExpiration <= 14 && daysUntilExpiration > 0;

    const localSettings = getParsedLocalSettings();
    const dismissedTimestamp = localSettings.metd;

    // Check if warning toast was dismissed within the past 24 hours
    let wasDismissedWithin24Hours = false;
    if (dismissedTimestamp) {
      try {
        const dismissedDate = new Date(dismissedTimestamp);
        const hoursSinceDismissal = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60);
        wasDismissedWithin24Hours = hoursSinceDismissal < 24 && hoursSinceDismissal >= 0;
      } catch {
        // If timestamp is invalid, treat as not dismissed
        wasDismissedWithin24Hours = false;
      }
    }

    const membershipType = isFreeTrial ? t('free_trial') : t('premium_membership');
    const expirationDateFormatted = expirationDate.toLocaleDateString();

    // Handler for danger toast: just dismisses, doesn't store timestamp (so it always shows on next load)
    const handleDismissDanger = () => {
      if (toastIdRef.current) {
        dismissToast(toastIdRef.current);
        toastIdRef.current = null;
      }
    };

    // Handler for warning toast: dismisses and stores timestamp to prevent showing for 24 hours
    const handleDismissWarning = () => {
      const settings = getParsedLocalSettings();
      // Store full ISO timestamp for 24-hour check
      handleLocalSettingsUpdate({
        ...settings,
        metd: now.toISOString(),
      });
      if (toastIdRef.current) {
        dismissToast(toastIdRef.current);
        toastIdRef.current = null;
      }
    };

    const handleLinkClickDanger = () => {
      handleDismissDanger();
      router.push(ROUTES.MEMBERSHIP);
    };

    const handleLinkClickWarning = () => {
      handleDismissWarning();
      router.push(ROUTES.MEMBERSHIP);
    };

    // Danger toast: Always show if expired (ignores dismissed timestamp, always shows on window load)
    if (isExpired) {
      if (toastIdRef.current) {
        dismissToast(toastIdRef.current);
      }
      const expiredMessage = t('membership_expired_danger', { type: membershipType });
      const linkText = t('membership_link_text');

      showToastCustom(
        {
          LinkComponent: Link,
          dismissButtonAriaLabel: tMisc('dismiss'),
          linkHref: ROUTES.MEMBERSHIP,
          linkText,
          message: expiredMessage,
          onDismiss: handleDismissDanger,
          onLinkClick: handleLinkClickDanger,
        },
        'danger'
      ).then((id) => {
        toastIdRef.current = id;
      });
      return;
    }

    // Warning toast: Show if expiring soon, not auto-renew, and not dismissed within past 24 hours
    if (isExpiringSoon && !autoRenew && !wasDismissedWithin24Hours) {
      if (toastIdRef.current) {
        dismissToast(toastIdRef.current);
      }
      const warningMessage = t('membership_expiring_warning', {
        type: membershipType,
        date: expirationDateFormatted,
      });
      const linkText = t('membership_link_text');

      showToastCustom(
        {
          LinkComponent: Link,
          dismissButtonAriaLabel: tMisc('dismiss'),
          linkHref: ROUTES.MEMBERSHIP,
          linkText,
          message: warningMessage,
          onDismiss: handleDismissWarning,
          onLinkClick: handleLinkClickWarning,
        },
        'warning'
      ).then((id) => {
        toastIdRef.current = id;
      });
      return;
    }

    // If not showing toast, dismiss any existing one
    if (toastIdRef.current) {
      dismissToast(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, [loggedInAccount, router, t, tMisc]);

  return null;
}
