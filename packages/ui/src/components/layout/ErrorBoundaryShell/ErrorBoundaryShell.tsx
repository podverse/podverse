'use client';

import { Button } from '../../button/Button/Button';

import styles from './ErrorBoundaryShell.module.scss';

function formatErrorDetails(error: Error & { digest?: string }): string {
  let text = error.toString();
  if (error.stack !== undefined && error.stack !== '') {
    text += `\n\n${error.stack}`;
  }
  if (error.digest !== undefined && error.digest !== '') {
    text += `\n\nDigest: ${error.digest}`;
  }
  return text;
}

function ErrorBoundaryBody({
  detailsSummaryLabel,
  error,
  goHomeLabel,
  message,
  onGoHome,
  onReload,
  onReset,
  reloadLabel,
  showDetails,
  showGoHomeButton,
  title,
  tryAgainLabel,
}: {
  detailsSummaryLabel: string;
  error: Error & { digest?: string };
  goHomeLabel?: string;
  message: string;
  onGoHome?: () => void;
  onReload: () => void;
  onReset: () => void;
  reloadLabel: string;
  showDetails: boolean;
  showGoHomeButton: boolean;
  title: string;
  tryAgainLabel: string;
}) {
  return (
    <div className={styles.errorBoundary}>
      <div className={styles.errorBoundaryContent}>
        <h2 className={styles.errorBoundaryTitle}>{title}</h2>
        <p className={styles.errorBoundaryMessage}>{message}</p>
        {showDetails ? (
          <details className={styles.errorDetails}>
            <summary className={styles.errorDetailsSummary}>{detailsSummaryLabel}</summary>
            <pre className={styles.errorDetailsContent}>{formatErrorDetails(error)}</pre>
          </details>
        ) : null}
        <div className={styles.errorBoundaryActions}>
          <Button onClick={onReset} variant="primary">
            {tryAgainLabel}
          </Button>
          <Button onClick={onReload} variant="secondary">
            {reloadLabel}
          </Button>
          {showGoHomeButton &&
          goHomeLabel !== undefined &&
          goHomeLabel !== '' &&
          onGoHome !== undefined ? (
            <Button onClick={onGoHome} variant="outline">
              {goHomeLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type ErrorBoundaryShellProps = {
  title: string;
  message: string;
  tryAgainLabel: string;
  reloadLabel: string;
  /** When set, renders a third action that navigates home (omit for two-button layouts). */
  goHomeLabel?: string;
  detailsSummaryLabel: string;
  error: Error & { digest?: string };
  onReset: () => void;
  /** When true, shows the expandable error details block (apps typically pass `NODE_ENV === 'development'`). */
  showDetails: boolean;
  onReload?: () => void;
  onGoHome?: () => void;
};

export function ErrorBoundaryShell({
  title,
  message,
  tryAgainLabel,
  reloadLabel,
  goHomeLabel,
  detailsSummaryLabel,
  error,
  onReset,
  showDetails,
  onReload,
  onGoHome,
}: ErrorBoundaryShellProps) {
  const handleReload =
    onReload ??
    (() => {
      window.location.reload();
    });
  const handleGoHome =
    onGoHome ??
    (() => {
      window.location.href = '/';
    });

  const showGoHomeButton = goHomeLabel !== undefined && goHomeLabel !== '';

  return (
    <ErrorBoundaryBody
      detailsSummaryLabel={detailsSummaryLabel}
      error={error}
      goHomeLabel={goHomeLabel}
      message={message}
      onGoHome={showGoHomeButton ? handleGoHome : undefined}
      onReload={handleReload}
      onReset={onReset}
      reloadLabel={reloadLabel}
      showDetails={showDetails}
      showGoHomeButton={showGoHomeButton}
      title={title}
      tryAgainLabel={tryAgainLabel}
    />
  );
}

export type GlobalErrorBoundaryShellProps = {
  title: string;
  message: string;
  tryAgainLabel: string;
  reloadLabel: string;
  detailsSummaryLabel: string;
  error: Error & { digest?: string };
  onReset: () => void;
  showDetails: boolean;
  onReload?: () => void;
};

export function GlobalErrorBoundaryShell({
  title,
  message,
  tryAgainLabel,
  reloadLabel,
  detailsSummaryLabel,
  error,
  onReset,
  showDetails,
  onReload,
}: GlobalErrorBoundaryShellProps) {
  const handleReload =
    onReload ??
    (() => {
      window.location.reload();
    });

  return (
    <html lang="en">
      <body>
        <ErrorBoundaryBody
          detailsSummaryLabel={detailsSummaryLabel}
          error={error}
          message={message}
          onReload={handleReload}
          onReset={onReset}
          reloadLabel={reloadLabel}
          showDetails={showDetails}
          showGoHomeButton={false}
          title={title}
          tryAgainLabel={tryAgainLabel}
        />
      </body>
    </html>
  );
}
