'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Alert, MainColumnStack, MainHeader, MainSidebarLayout, SideContent } from '@podverse/ui';

import { MainWrapper } from '../../../components/Main/MainWrapper';
import { useConfig } from '../../../contexts/Config';
import { getApiRequestService } from '../../../factories/apiRequestService';

const SUCCESS_POLL_TIMEOUT_MS = 30_000;

type SuccessPhase = 'waiting' | 'active' | 'timeout';

export function CheckoutSuccessPageClient() {
  const t = useTranslations('checkout');
  const config = useConfig();
  const [phase, setPhase] = useState<SuccessPhase>('waiting');
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

  return (
    <>
      <MainHeader title={t('checkout')} />
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            {phase === 'waiting' ? <p>{t('success_waiting')}</p> : null}
            {phase === 'active' ? <Alert variant="success">{t('success_active')}</Alert> : null}
            {phase === 'timeout' ? <Alert>{t('success_timeout')}</Alert> : null}
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
