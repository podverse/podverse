'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import type { DTOBillingStatus } from '@podverse/helpers';
import { formatDateAbbrev, formatSavedDuration, isPaymentProcessorId } from '@podverse/helpers';
import { ActionLink, Alert, Button } from '@podverse/ui';

import { ROUTES } from '../../../../constants/routes';
import { getApiRequestService } from '../../../../factories/apiRequestService';
import { SettingsSection } from '../../SettingsSection';

import styles from './SettingsMembership.module.scss';

const APP_STORE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
const PLAY_STORE_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

type SettingsMembershipProps = {
  onStatus: (status: DTOBillingStatus | null) => void;
};

function billingDate(value: string | null, locale: string): string | null {
  if (value === null || value === '') {
    return null;
  }
  return formatDateAbbrev(value, locale);
}

export function SettingsMembership({ onStatus }: SettingsMembershipProps) {
  const t = useTranslations('settings.membership');
  const tMembership = useTranslations('membership');
  const locale = useLocale();
  const [status, setStatus] = useState<DTOBillingStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeManaged, setStoreManaged] = useState(false);

  const applyStatus = useCallback(
    (next: DTOBillingStatus | null) => {
      setStatus(next);
      onStatus(next);
    },
    [onStatus]
  );

  useEffect(() => {
    let active = true;
    getApiRequestService()
      .reqBillingGetStatus()
      .then((next) => {
        if (active) {
          applyStatus(next);
        }
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          applyStatus(null);
        }
      });
    return () => {
      active = false;
    };
  }, [applyStatus]);

  const subscription = status?.active_subscription ?? null;
  const processorId =
    subscription !== null && isPaymentProcessorId(subscription.processor_id)
      ? subscription.processor_id
      : null;
  const periodLabel =
    status === null
      ? null
      : billingDate(subscription?.current_period_end ?? status.membership_expires_at, locale);
  const showRenews = status?.active_auto_renew === true && periodLabel !== null;
  const showExpires = status !== null && status.active_auto_renew !== true && periodLabel !== null;
  const canCancelHere =
    status?.active_auto_renew === true &&
    subscription !== null &&
    (processorId === 'paypal' || processorId === 'test');
  const showStore =
    (status?.active_auto_renew === true || storeManaged) &&
    (processorId === 'apple' || processorId === 'google_play');
  const savedDuration =
    subscription === null
      ? null
      : formatSavedDuration(subscription.banked_seconds, (segment) =>
          tMembership(
            `saved_duration_${segment.unit}_${segment.count === 1 ? 'one' : 'other'}`,
            { count: segment.count }
          )
        );

  const cancelAutoRenew = async () => {
    if (subscription === null) {
      return;
    }
    setCancelling(true);
    setError(null);
    try {
      const result = await getApiRequestService().reqBillingCancelSubscription(subscription.id);
      applyStatus(result.status);
      if (result.outcome === 'manage_in_store') {
        setStoreManaged(true);
      }
    } catch {
      setError(t('cancel_failed'));
    } finally {
      setCancelling(false);
    }
  };

  let tierLabel = t('tier_none');
  if (status !== null && status.is_entitled && status.tier === 'premium') {
    tierLabel = t('tier_premium');
  } else if (status !== null && status.is_entitled && status.tier === 'trial') {
    tierLabel = t('tier_trial');
  } else if (status !== null && !status.is_entitled && status.tier !== null) {
    tierLabel = t('tier_expired');
  }

  let processorLabel = t('processor_none');
  if (processorId === 'paypal') {
    processorLabel = t('processor_paypal');
  } else if (processorId === 'apple') {
    processorLabel = t('processor_apple');
  } else if (processorId === 'google_play') {
    processorLabel = t('processor_google');
  } else if (processorId === 'test') {
    processorLabel = t('processor_test');
  } else if (subscription !== null && processorId === null) {
    processorLabel = subscription.processor_id;
  }

  return (
    <SettingsSection>
      <section aria-labelledby="settings-membership-heading">
        <h3 id="settings-membership-heading">{t('heading')}</h3>
        {loadFailed ? <Alert>{t('load_failed')}</Alert> : null}
        {status?.in_grace_period === true ? <Alert variant="default">{t('grace')}</Alert> : null}
        {error !== null ? <Alert>{error}</Alert> : null}
        {status !== null ? (
          <dl className={styles.fields}>
            <dt>{t('tier')}</dt>
            <dd>{tierLabel}</dd>
            <dt>{t('processor')}</dt>
            <dd>{processorLabel}</dd>
            {showRenews ? (
              <>
                <dt>{t('renews_on')}</dt>
                <dd>{periodLabel}</dd>
              </>
            ) : null}
            {showExpires ? (
              <>
                <dt>{t('expires_on')}</dt>
                <dd>{periodLabel}</dd>
              </>
            ) : null}
          </dl>
        ) : null}
        {showRenews && savedDuration !== null ? (
          <p className={styles.notice}>{t('saved_time_caption', { duration: savedDuration })}</p>
        ) : null}
        {subscription?.status === 'cancelled_active' ? <p>{t('auto_renew_off')}</p> : null}
        <div className={styles.actions}>
          {canCancelHere ? (
            <Button
              type="button"
              variant="secondary"
              onClick={cancelAutoRenew}
              isLoading={cancelling}
              disabled={cancelling}
            >
              {t('cancel_auto_renew')}
            </Button>
          ) : null}
          {showStore ? (
            <>
              <p className={styles.notice}>{t('store_instructions')}</p>
              {processorId === 'google_play' ? (
                <a href={PLAY_STORE_SUBSCRIPTIONS_URL} rel="noopener noreferrer" target="_blank">
                  {t('manage_in_play')}
                </a>
              ) : (
                <a href={APP_STORE_SUBSCRIPTIONS_URL} rel="noopener noreferrer" target="_blank">
                  {t('manage_in_app_store')}
                </a>
              )}
            </>
          ) : null}
          {status !== null && status.active_auto_renew !== true ? (
            <>
              {status.is_entitled ? (
                <p className={styles.notice}>{t('resubscribe_paypal_notice')}</p>
              ) : null}
              <ActionLink href={ROUTES.CHECKOUT} LinkComponent={Link}>
                {t('resubscribe')}
              </ActionLink>
            </>
          ) : null}
          <ActionLink href={ROUTES.MEMBERSHIP} LinkComponent={Link}>
            {t('compare_plans')}
          </ActionLink>
        </div>
      </section>
    </SettingsSection>
  );
}
