'use client';

import { useTranslations } from 'next-intl';

import { ErrorBoundaryShell } from '@podverse/ui';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorPageProps) {
  const tErrors = useTranslations('errors');
  const tMisc = useTranslations('misc');

  return (
    <ErrorBoundaryShell
      title={tErrors('boundary_title')}
      message={tErrors('boundary_message')}
      tryAgainLabel={tMisc('try_again')}
      reloadLabel={tMisc('reload_page')}
      goHomeLabel={tMisc('return_to_home_page')}
      detailsSummaryLabel={tErrors('details_development_only')}
      error={error}
      onReset={reset}
      showDetails={process.env.NODE_ENV === 'development'}
    />
  );
}
