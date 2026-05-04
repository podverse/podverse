'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { isMembershipExpiredAt } from '@podverse/helpers';

import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';

import styles from '../../styles/components/Banner/MembershipExpiredBanner.module.scss';

export const MembershipExpiredBanner = () => {
  const t = useTranslations('membership');
  const { loggedInAccount } = useAccount();

  const membershipExpiresAt = loggedInAccount?.account_membership_status?.membership_expires_at;
  if (!membershipExpiresAt) {
    return null;
  }

  if (!isMembershipExpiredAt(membershipExpiresAt)) {
    return null;
  }

  return (
    <div className={styles.banner} role="status">
      <span>{t('membership_expired')}</span>
      <Link href={ROUTES.MEMBERSHIP_RENEW} className={styles.renewLink}>
        {t('renew_membership')}
      </Link>
    </div>
  );
};
