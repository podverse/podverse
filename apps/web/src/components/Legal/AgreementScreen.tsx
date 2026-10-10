'use client';

import type { ReactNode } from 'react';

import { Accordion, Button, TextCheckboxes } from '@podverse/ui';

import { WebLoadingSpinnerOverlay } from '../LoadingSpinner/WebLoadingSpinnerOverlay';
import { CopyMarkdown } from '../Markdown/CopyMarkdown';

import styles from './AgreementScreen.module.scss';

export type AgreementScreenProps = {
  title: string;
  dateLabel: string | null;
  introMarkdown: string | null;
  fullMarkdown: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  retryLabel: string;
  onRetry: () => void;
  acceptLabel: string;
  rejectLabel: string;
  onAccept: () => void;
  onReject: () => void;
  pending: boolean;
  acceptDisabled: boolean;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
  accordionTitle: string;
  testId: string;
};

export function AgreementScreen({
  title,
  dateLabel,
  introMarkdown,
  fullMarkdown,
  isLoading,
  errorMessage,
  retryLabel,
  onRetry,
  acceptLabel,
  rejectLabel,
  onAccept,
  onReject,
  pending,
  acceptDisabled,
  checkboxLabel,
  checkboxChecked = false,
  onCheckboxChange,
  accordionTitle,
  testId,
}: AgreementScreenProps) {
  const showCopy = introMarkdown !== null && errorMessage === null && !isLoading;
  let checkbox: ReactNode = null;
  if (checkboxLabel !== undefined && onCheckboxChange !== undefined) {
    checkbox = (
      <TextCheckboxes
        name={`${testId}-read`}
        onChange={(selectedValues) => {
          onCheckboxChange(selectedValues.includes('agreed'));
        }}
        options={[{ label: checkboxLabel, value: 'agreed' }]}
        selectedValues={checkboxChecked ? ['agreed'] : []}
      />
    );
  }

  return (
    <main aria-label={title} className={styles.screen} data-testid={testId}>
      <div className={styles.panel}>
        <h1 className={styles.title}>{title}</h1>
        {dateLabel !== null ? <p className={styles.date}>{dateLabel}</p> : null}
        {showCopy && introMarkdown !== null ? (
          <div className={styles.intro}>
            <CopyMarkdown markdown={introMarkdown} />
          </div>
        ) : null}
        {errorMessage !== null ? (
          <div className={styles.error}>
            <p>{errorMessage}</p>
            <Button onClick={onRetry} type="button" variant="secondary">
              {retryLabel}
            </Button>
          </div>
        ) : null}
        {checkbox}
        <div className={styles.actions}>
          <Button
            disabled={pending}
            onClick={onReject}
            type="button"
            variant="secondary"
          >
            {rejectLabel}
          </Button>
          <Button
            disabled={acceptDisabled || pending}
            onClick={onAccept}
            type="button"
            variant="primary"
          >
            {acceptLabel}
          </Button>
        </div>
        {showCopy && fullMarkdown !== null ? (
          <Accordion header={accordionTitle}>
            <CopyMarkdown markdown={fullMarkdown} />
          </Accordion>
        ) : null}
        <WebLoadingSpinnerOverlay isLoading={isLoading} />
      </div>
    </main>
  );
}
