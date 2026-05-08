'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { isMembershipExpiredAt } from '@podverse/helpers';
import { Banner } from '@podverse/ui';

import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';

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
    <Banner
      variant="danger"
      role="status"
      message={t('membership_expired')}
      action={<Link href={ROUTES.MEMBERSHIP_RENEW}>{t('renew_membership')}</Link>}
    />
  );
};
