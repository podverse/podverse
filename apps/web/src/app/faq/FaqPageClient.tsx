'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@podverse/ui';

import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { CopyMarkdown } from '../../components/Markdown/CopyMarkdown';
import { getApiRequestService } from '../../factories/apiRequestService';

export function FaqPageClient() {
  const t = useTranslations('misc');
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCounter, setRetryCounter] = useState<number>(0);

  const retry = useCallback(() => {
    setRetryCounter((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);
    void getApiRequestService()
      .reqManagedCopyGet('faq')
      .then((response) => {
        if (!cancelled) {
          setMarkdown(response.markdown);
          setHasError(false);
        }
      })
      .catch((error: unknown) => {
        console.error('[FaqPageClient] load failed', error);
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
  }, [retryCounter]);

  const showError = hasError || (!isLoading && markdown === null);

  return (
    <section style={{ minHeight: 240, position: 'relative' }}>
      {!showError && markdown !== null ? <CopyMarkdown markdown={markdown} /> : null}
      {showError ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <p>{t('errors.generic')}</p>
          <Button onClick={retry} type="button" variant="secondary">
            {t('retry')}
          </Button>
        </div>
      ) : null}
      {isLoading ? <WebLoadingSpinnerOverlay /> : null}
    </section>
  );
}
