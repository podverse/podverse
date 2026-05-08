'use client';

import type { ReactNode } from 'react';

import { Button } from '../../button/Button/Button';

import styles from './BulkActionBar.module.scss';

export type BulkActionBarAction = {
  label: string;
  onClick: () => void;
  variant?: 'danger' | 'primary' | 'secondary';
};

export type BulkActionBarProps = {
  actions: BulkActionBarAction[];
  clearLabel: string;
  onClear: () => void;
  /** Localized summary, e.g. `t('bulkSelected', { count })`. */
  selectedSummary: ReactNode;
};

export function BulkActionBar({
  actions,
  clearLabel,
  onClear,
  selectedSummary,
}: BulkActionBarProps) {
  return (
    <div className={styles.root}>
      <span className={styles.meta}>{selectedSummary}</span>
      <div className={styles.actions}>
        {actions.map((a) => (
          <Button
            key={a.label}
            onClick={() => {
              a.onClick();
            }}
            type="button"
            variant={a.variant ?? 'secondary'}
          >
            {a.label}
          </Button>
        ))}
        <Button onClick={onClear} type="button" variant="secondary">
          {clearLabel}
        </Button>
      </div>
    </div>
  );
}
