'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { deriveMembershipState } from '@podverse/helpers';
import { Banner } from '@podverse/ui';

import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';

export const MembershipExpiredBanner = () => {
  const t = useTranslations('membership');
  const { loggedInAccount } = useAccount();

  if (!deriveMembershipState(loggedInAccount).isExpired) {
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
