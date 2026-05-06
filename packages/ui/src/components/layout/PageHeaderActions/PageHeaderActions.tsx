import type { ReactNode } from 'react';

import styles from './PageHeaderActions.module.scss';

export type PageHeaderActionsProps = {
  children: ReactNode;
};

export function PageHeaderActions({ children }: PageHeaderActionsProps) {
  return <div className={styles.actions}>{children}</div>;
}
