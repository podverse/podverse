import type { ReactNode } from 'react';

import { Alert } from '../Alert/Alert';

import styles from './RestrictedNotice.module.scss';

export type RestrictedNoticeProps = {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function RestrictedNotice({ title, children, className }: RestrictedNoticeProps) {
  return (
    <Alert variant="default" className={className}>
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      <div className={styles.body}>{children}</div>
    </Alert>
  );
}
