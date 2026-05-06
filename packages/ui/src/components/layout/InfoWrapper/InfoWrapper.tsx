import type { ReactNode } from 'react';

import styles from './InfoWrapper.module.scss';

export type InfoWrapperProps = {
  children: ReactNode;
};

export function InfoWrapper({ children }: InfoWrapperProps) {
  return <div className={styles.infoWrapper}>{children}</div>;
}
