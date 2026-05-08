import type { ReactNode } from 'react';

import styles from './SideContent.module.scss';

export type SideContentProps = {
  children?: ReactNode;
};

export function SideContent({ children }: SideContentProps) {
  return <aside className={styles.sideContent}>{children}</aside>;
}
