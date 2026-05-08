'use client';

import { useEffect, useState } from 'react';

import type { MiscTranslations } from '@podverse/ui';
import {
  DEFAULT_GLOBAL_ERROR_FALLBACK_ERRORS,
  DEFAULT_GLOBAL_ERROR_FALLBACK_MISC,
  GlobalErrorBoundaryShell,
  loadGlobalErrorTranslations,
} from '@podverse/ui';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [translations, setTranslations] = useState<{
    errors: Record<string, string>;
    misc: MiscTranslations;
  }>({
    errors: DEFAULT_GLOBAL_ERROR_FALLBACK_ERRORS,
    misc: DEFAULT_GLOBAL_ERROR_FALLBACK_MISC,
  });

  useEffect(() => {
    loadGlobalErrorTranslations({
      loadMessages: (locale) => import(`../../i18n/originals/${locale}.json`),
      loadFallback: () => import('../../i18n/originals/en-US.json'),
      fallbackErrors: DEFAULT_GLOBAL_ERROR_FALLBACK_ERRORS,
      fallbackMisc: DEFAULT_GLOBAL_ERROR_FALLBACK_MISC,
    }).then(setTranslations);
  }, []);

  const tErrors = (key: string): string => {
    return translations.errors[key] ?? key;
  };

  const tMisc = (key: string): string => {
    const value = translations.misc[key];
    return typeof value === 'string' ? value : key;
  };

  return (
    <GlobalErrorBoundaryShell
      title={tErrors('global_title')}
      message={tErrors('global_message')}
      tryAgainLabel={tMisc('try_again')}
      reloadLabel={tMisc('reload_page')}
      detailsSummaryLabel={tErrors('details_development_only')}
      error={error}
      onReset={reset}
      showDetails={process.env.NODE_ENV === 'development'}
    />
  );
}
