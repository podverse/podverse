'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { DTOBillingStatus } from '@podverse/helpers';
import { formatDateAbbrev } from '@podverse/helpers';
import {
  Alert,
  CenteredMessage,
  MainColumnStack,
  MainHeader,
  MainSidebarLayout,
} from '@podverse/ui';

import { MainWrapper } from '../../../components/Main/MainWrapper';
import { ROUTES } from '../../../constants/routes';
import { useConfig } from '../../../contexts/Config';
import { getApiRequestService } from '../../../factories/apiRequestService';

import styles from '../../../styles/app/checkout/Checkout.module.scss';

const SUCCESS_POLL_TIMEOUT_MS = 30_000;
/** How long the purchase result stays on screen before Membership opens. */
const SUCCESS_REDIRECT_DELAY_MS = 4_000;

type SuccessPhase = 'waiting' | 'active' | 'timeout';

function activeSuccessMessage(
  status: DTOBillingStatus,
  locale: string,
  t: ReturnType<typeof useTranslations<'checkout'>>
): string {
  if (status.membership_expires_at === null) {
    return t('success_active');
  }
  const date = formatDateAbbrev(status.membership_expires_at, locale);
  if (status.billing_cadence === 'monthly') {
    return t('success_extended_month', { date });
  }
  if (status.billing_cadence === 'annual') {
    return t('success_extended_year', { date });
  }
  return t('success_active_expires', { date });
}

export function CheckoutSuccessPageClient() {
  const t = useTranslations('checkout');
  const locale = useLocale();
  const router = useRouter();
  const config = useConfig();
  const [phase, setPhase] = useState<SuccessPhase>('waiting');
  const [billingStatus, setBillingStatus] = useState<DTOBillingStatus | null>(null);
  const intervalMs = config.public.polling.interval_ms;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();

    const tick = async () => {
      try {
        const status = await getApiRequestService().reqBillingGetStatus();
        if (cancelled) {
          return;
        }
        if (status.is_entitled) {
          setBillingStatus(status);
          setPhase('active');
          return;
        }
      } catch {
        if (cancelled) {
          return;
        }
      }
      if (Date.now() - started >= SUCCESS_POLL_TIMEOUT_MS) {
        setPhase('timeout');
        return;
      }
      const waitMs = Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 3000;
      timer = setTimeout(() => {
        void tick();
      }, waitMs);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [intervalMs]);

  useEffect(() => {
    if (phase !== 'active') {
      return;
    }
    const timer = setTimeout(() => {
      router.replace(ROUTES.MEMBERSHIP);
    }, SUCCESS_REDIRECT_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [phase, router]);

  return (
    <>
      <MainHeader title={t('checkout')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <CenteredMessage live={phase === 'timeout' ? 'alert' : 'status'}>
              {phase === 'waiting' ? <span>{t('success_waiting')}</span> : null}
              {phase === 'active' && billingStatus !== null ? (
                <Alert
                  className={`${styles.pageNotice} ${styles.successDetail}`}
                  testId="checkout-success-detail"
                  variant="success"
                >
                  {activeSuccessMessage(billingStatus, locale, t)}
                  <span className={styles.successContinue}>{t('success_opening_membership')}</span>
                </Alert>
              ) : null}
              {phase === 'timeout' ? (
                <Alert className={styles.pageNotice}>{t('success_timeout')}</Alert>
              ) : null}
            </CenteredMessage>
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
