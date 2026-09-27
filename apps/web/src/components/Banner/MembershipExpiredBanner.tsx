'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { deriveMembershipState } from '@podverse/helpers';
import { Banner } from '@podverse/ui';

import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';
import { getApiRequestService } from '../../factories/apiRequestService';

const manageHref = `${ROUTES.SETTINGS}?tab=account`;

export const MembershipExpiredBanner = () => {
  const t = useTranslations('membership');
  const { loggedInAccount } = useAccount();
  const [inGrace, setInGrace] = useState(false);
  const accountId = loggedInAccount?.id;

  useEffect(() => {
    if (accountId === undefined) {
      setInGrace(false);
      return;
    }
    let active = true;
    getApiRequestService()
      .reqBillingGetStatus()
      .then((status) => {
        if (active) {
          setInGrace(status.in_grace_period);
        }
      })
      .catch(() => {
        if (active) {
          setInGrace(false);
        }
      });
    return () => {
      active = false;
    };
  }, [accountId]);

  if (inGrace) {
    return (
      <Banner
        variant="danger"
        role="status"
        message={t('manage.grace_banner')}
        action={<Link href={manageHref}>{t('manage.manage_membership')}</Link>}
      />
    );
  }

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
