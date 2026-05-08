import type { ReactNode } from 'react';

import styles from './MainColumnStack.module.scss';

export type MainColumnStackProps = {
  children: ReactNode;
};

export function MainColumnStack({ children }: MainColumnStackProps) {
  return <div className={styles.mainColumnStack}>{children}</div>;
}
