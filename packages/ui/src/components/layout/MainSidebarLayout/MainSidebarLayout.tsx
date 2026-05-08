import type { ReactNode } from 'react';

import styles from './MainSidebarLayout.module.scss';

export type MainSidebarLayoutProps = {
  children: ReactNode;
};

export function MainSidebarLayout({ children }: MainSidebarLayoutProps) {
  return <div className={styles.mainSidebarLayout}>{children}</div>;
}
