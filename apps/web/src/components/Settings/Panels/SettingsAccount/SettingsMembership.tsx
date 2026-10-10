'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { DTOBillingStatus } from '@podverse/helpers';
import { formatDateAbbrev } from '@podverse/helpers';
import { ActionLink, Alert } from '@podverse/ui';

import { ROUTES } from '../../../../constants/routes';
import { getApiRequestService } from '../../../../factories/apiRequestService';
import { SettingsSection } from '../../SettingsSection';

import styles from './SettingsMembership.module.scss';

function billingDate(value: string | null, locale: string): string | null {
  if (value === null || value === '') {
    return null;
  }
  return formatDateAbbrev(value, locale);
}

export function SettingsMembership() {
  const t = useTranslations('settings.membership');
  const tMembership = useTranslations('membership');
  const locale = useLocale();
  const [status, setStatus] = useState<DTOBillingStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getApiRequestService()
      .reqBillingGetStatus()
      .then((next) => {
        if (active) {
          setStatus(next);
        }
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          setStatus(null);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const expiresOn = status === null ? null : billingDate(status.membership_expires_at, locale);

  let tierLabel = t('tier_none');
  if (status !== null && status.is_entitled && status.tier === 'premium') {
    tierLabel = t('tier_premium');
  } else if (status !== null && status.is_entitled && status.tier === 'trial') {
    tierLabel = t('tier_trial');
  } else if (status !== null && !status.is_entitled && status.tier !== null) {
    tierLabel = t('tier_expired');
  }

  return (
    <SettingsSection>
      <section aria-labelledby="settings-membership-heading">
        <h3 id="settings-membership-heading">{t('heading')}</h3>
        {loadFailed ? <Alert>{t('load_failed')}</Alert> : null}
        {status !== null ? (
          <>
            <dl className={styles.fields}>
              <dt>{t('tier')}</dt>
              <dd>{tierLabel}</dd>
              {expiresOn !== null ? (
                <>
                  <dt>{t('expires_on')}</dt>
                  <dd>{expiresOn}</dd>
                </>
              ) : null}
            </dl>
            <div className={styles.actions}>
              <ActionLink href={ROUTES.CHECKOUT} LinkComponent={Link}>
                {status.is_entitled ? t('buy_more_time') : tMembership('renew_membership')}
              </ActionLink>
              <ActionLink href={ROUTES.MEMBERSHIP} LinkComponent={Link}>
                {t('compare_plans')}
              </ActionLink>
            </div>
          </>
        ) : null}
      </section>
    </SettingsSection>
  );
}
