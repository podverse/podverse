'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import {
  deriveMembershipState,
  getMembershipExpiryDismissalKey,
  getMembershipExpiryNotice,
} from '@podverse/helpers';

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
  const expiredDismissedRef = useRef(false);

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
    const expirationDate = new Date(membership.expiresAt);
    const expiryNotice = getMembershipExpiryNotice(membership);
    const dismissalKey = getMembershipExpiryDismissalKey(expiryNotice, membership.expiresAt);
    const isExpired = expiryNotice.status === 'expired';
    const isExpiringSoon = expiryNotice.status === 'expiring_soon';
    const expiringDismissed =
      dismissalKey !== null && getParsedLocalSettings().metd === dismissalKey;

    const membershipType = isFreeTrial ? t('free_trial') : t('premium_membership');
    const expirationDateFormatted = expirationDate.toLocaleDateString();

    const clearToast = () => {
      if (toastIdRef.current) {
        dismissToast(toastIdRef.current);
        toastIdRef.current = null;
      }
    };

    const handleDismissExpired = () => {
      expiredDismissedRef.current = true;
      clearToast();
    };

    const handleDismissExpiring = () => {
      if (dismissalKey !== null) {
        const settings = getParsedLocalSettings();
        handleLocalSettingsUpdate({
          ...settings,
          metd: dismissalKey,
        });
      }
      clearToast();
    };

    if (isExpired && !expiredDismissedRef.current) {
      clearToast();
      const expiredMessage = t('membership_expired_danger', { type: membershipType });
      const linkText = t('membership_link_text');

      showToastCustom(
        {
          LinkComponent: Link,
          dismissButtonAriaLabel: tMisc('dismiss'),
          linkHref: ROUTES.MEMBERSHIP,
          linkText,
          message: expiredMessage,
          onDismiss: handleDismissExpired,
          onLinkClick: () => {
            handleDismissExpired();
            router.push(ROUTES.MEMBERSHIP);
          },
        },
        'danger'
      ).then((id) => {
        toastIdRef.current = id;
      });
      return;
    }

    if (isExpiringSoon && dismissalKey !== null && !expiringDismissed) {
      clearToast();
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
          onDismiss: handleDismissExpiring,
          onLinkClick: () => {
            handleDismissExpiring();
            router.push(ROUTES.MEMBERSHIP);
          },
        },
        'warning'
      ).then((id) => {
        toastIdRef.current = id;
      });
      return;
    }

    clearToast();
  }, [loggedInAccount, router, t, tMisc]);

  return null;
}
