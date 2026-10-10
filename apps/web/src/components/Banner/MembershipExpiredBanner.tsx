'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  deriveMembershipState,
  getMembershipExpiryDismissalKey,
  getMembershipExpiryNotice,
} from '@podverse/helpers';
import { Banner } from '@podverse/ui';

import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';

import styles from './MembershipExpiredBanner.module.scss';

export const MembershipExpiredBanner = () => {
  const t = useTranslations('membership');
  const { loggedInAccount } = useAccount();
  const [dismissed, setDismissed] = useState(false);
  const membership = deriveMembershipState(loggedInAccount);
  const notice = getMembershipExpiryNotice(membership);
  const dismissalKey = getMembershipExpiryDismissalKey(notice, membership.expiresAt);

  if (dismissalKey !== null || notice.status !== 'expired' || dismissed) {
    return null;
  }

  return (
    <div data-testid="membership-expired-banner">
      <Banner
        variant="danger"
        role="status"
        message={t('membership_expired')}
        action={
          <span className={styles.actions}>
            <Link href={ROUTES.MEMBERSHIP_RENEW}>{t('renew_membership')}</Link>
            <button type="button" className={styles.dismiss} onClick={() => setDismissed(true)}>
              {t('gate.banner_dismiss')}
            </button>
          </span>
        }
      />
    </div>
  );
};
