import type { ReactNode } from 'react';

import styles from './DescriptionList.module.scss';

export type DescriptionListProps = {
  variant: 'flat' | 'rows';
  children: ReactNode;
  className?: string;
};

export function DescriptionList({ variant, children, className = '' }: DescriptionListProps) {
  const rootClass =
    variant === 'flat'
      ? `${styles.flat} ${className}`.trim()
      : `${styles.rowsRoot} ${className}`.trim();

  return <dl className={rootClass}>{children}</dl>;
}

export type DescriptionListRowProps = {
  term: ReactNode;
  detail: ReactNode;
  detailClassName?: string;
};

export function DescriptionListRow({
  term,
  detail,
  detailClassName = '',
}: DescriptionListRowProps) {
  const ddClass = `${styles.detail} ${detailClassName}`.trim();
  return (
    <div className={styles.row}>
      <dt className={styles.term}>{term}</dt>
      <dd className={ddClass}>{detail}</dd>
    </div>
  );
}
