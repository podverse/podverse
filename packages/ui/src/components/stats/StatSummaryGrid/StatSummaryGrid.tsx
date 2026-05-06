import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './StatSummaryGrid.module.scss';

export type StatSummaryItem = {
  label: ReactNode;
  value: ReactNode;
};

export type StatSummaryGridProps = {
  items: StatSummaryItem[];
  className?: string;
};

export function StatSummaryGrid({ items, className }: StatSummaryGridProps) {
  return (
    <div className={classNames(styles.grid, className)}>
      {items.map((item, index) => (
        <div
          key={typeof item.label === 'string' ? `${item.label}-${index}` : `stat-summary-${index}`}
          className={styles.item}
        >
          <span className={styles.label}>{item.label}</span>
          <span className={styles.value}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
