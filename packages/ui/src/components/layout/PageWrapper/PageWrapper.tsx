import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './PageWrapper.module.scss';

export type PageWrapperProps = {
  children: ReactNode;
  className?: string;
};

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div id="page-wrapper" className={classNames(styles.pageWrapper, className)}>
      {children}
    </div>
  );
}
