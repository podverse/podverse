'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { getCopyMarkdownIntro } from '@podverse/helpers';
import type { DTOTermsAgreement } from '@podverse/helpers';

import { useAccount } from '../../contexts/Account';
import { getApiRequestService } from '../../factories/apiRequestService';
import { showToast } from '../Toast/Toast';
import { AgreementScreen } from './AgreementScreen';

export function TermsAgreementGate() {
  const t = useTranslations('terms_acceptance');
  const locale = useLocale();
  const { setLoggedInAccount } = useAccount();
  const [agreement, setAgreement] = useState<DTOTermsAgreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);

  const retry = useCallback(() => {
    setRetryCounter((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    void getApiRequestService()
      .reqLegalTerms({ locale })
      .then((data) => {
        if (!cancelled) {
          setAgreement(data);
          setHasError(false);
        }
      })
      .catch((error: unknown) => {
        console.error('[TermsAgreementGate] load failed', error);
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
  }, [locale, retryCounter]);

  const handleAccept = async () => {
    if (agreement === null || pending || !checked) {
      return;
    }
    setPending(true);
    try {
      await getApiRequestService().reqAccountAcceptTerms({
        terms_version: agreement.version,
      });
      const account = await getApiRequestService().reqAuthMe();
      setLoggedInAccount(account);
    } catch (error) {
      console.error('[TermsAgreementGate] accept failed', error);
      showToast(t('load_error'), 'error');
    } finally {
      setPending(false);
    }
  };

  const handleReject = async () => {
    if (pending) {
      return;
    }
    setPending(true);
    try {
      await getApiRequestService().reqAuthLogout();
    } catch (error) {
      console.error('[TermsAgreementGate] logout failed', error);
    }
    window.location.assign('/');
  };

  return (
    <AgreementScreen
      acceptDisabled={agreement === null || !checked}
      acceptLabel={t('accept')}
      accordionTitle={t('full_agreement')}
      checkboxChecked={checked}
      checkboxLabel={t('checkbox_label')}
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
        void handleAccept();
      }}
      onCheckboxChange={setChecked}
      onReject={() => {
        void handleReject();
      }}
      onRetry={retry}
      pending={pending}
      rejectLabel={t('reject')}
      retryLabel={t('retry')}
      testId="terms-agreement"
      title={t('header')}
    />
  );
}
