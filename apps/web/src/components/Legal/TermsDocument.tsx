'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import type { DTOTermsAgreement } from '@podverse/helpers';
import { Button } from '@podverse/ui';

import { getApiRequestService } from '../../factories/apiRequestService';
import { WebLoadingSpinnerOverlay } from '../LoadingSpinner/WebLoadingSpinnerOverlay';
import { CopyMarkdown } from '../Markdown/CopyMarkdown';

export function TermsDocument() {
  const t = useTranslations('terms_acceptance');
  const locale = useLocale();
  const [agreement, setAgreement] = useState<DTOTermsAgreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);

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
        console.error('[TermsDocument] load failed', error);
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

  return (
    <section style={{ minHeight: 240, position: 'relative' }}>
      {agreement !== null && !hasError ? (
        <>
          <p>{t('agreement_date', { agreement_date: agreement.version })}</p>
          <CopyMarkdown markdown={agreement.markdown} />
        </>
      ) : null}
      {hasError ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <p>{t('load_error')}</p>
          <Button onClick={retry} type="button" variant="secondary">
            {t('retry')}
          </Button>
        </div>
      ) : null}
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </section>
  );
}
