'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { getCopyMarkdownIntro } from '@podverse/helpers';
import type { DTOPopularityTrackingAgreement } from '@podverse/helpers';

import { useAccount } from '../../contexts/Account';
import { getApiRequestService } from '../../factories/apiRequestService';
import { showToast } from '../Toast/Toast';
import { AgreementScreen } from './AgreementScreen';

type PopularityAgreementGateProps = {
  onDecided?: () => void;
};

export function PopularityAgreementGate({ onDecided }: PopularityAgreementGateProps) {
  const t = useTranslations('popularity_tracking');
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const [agreement, setAgreement] = useState<DTOPopularityTrackingAgreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);
  const [pending, setPending] = useState(false);
  const accountIdText = loggedInAccount?.id_text ?? null;

  const retry = useCallback(() => {
    setRetryCounter((current) => current + 1);
  }, []);

  useEffect(() => {
    if (accountIdText === null) {
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    void getApiRequestService()
      .reqLegalPopularityTracking()
      .then((data) => {
        if (!cancelled) {
          setAgreement(data);
          setHasError(false);
        }
      })
      .catch((error: unknown) => {
        console.error('[PopularityAgreementGate] load failed', error);
        if (!cancelled) {
          setHasError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accountIdText, retryCounter]);

  const handleDecision = async (accepted: boolean) => {
    if (pending || (accepted && agreement === null)) {
      return;
    }
    setPending(true);
    try {
      const updatedAccount = await getApiRequestService().reqAccountSettingsListenStatsUpdate({
        accepted,
      });
      setLoggedInAccount(updatedAccount);
      onDecided?.();
    } catch (error) {
      console.error('[PopularityAgreementGate] update failed', error);
      showToast(t('error'), 'error');
    } finally {
      setPending(false);
    }
  };

  return (
    <AgreementScreen
      acceptDisabled={agreement === null}
      acceptLabel={t('yes')}
      accordionTitle={t('full_agreement')}
      dateLabel={
        agreement === null
          ? null
          : t('agreement_date', { agreement_date: agreement.version })
      }
      errorMessage={hasError ? t('load_error') : null}
      fullMarkdown={agreement?.markdown ?? null}
      introMarkdown={agreement === null ? null : getCopyMarkdownIntro(agreement.markdown)}
      isLoading={isLoading}
      onAccept={() => {
        void handleDecision(true);
      }}
      onReject={() => {
        void handleDecision(false);
      }}
      onRetry={retry}
      pending={pending}
      rejectLabel={t('no')}
      retryLabel={t('retry')}
      testId="popularity-agreement"
      title={t('title')}
    />
  );
}
