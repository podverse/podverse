import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './PageWrapperMain.module.scss';

export type PageWrapperMainProps = {
  children: ReactNode;
  className?: string;
};

export function PageWrapperMain({ children, className }: PageWrapperMainProps) {
  return <div className={classNames(styles.pageWrapperMain, className)}>{children}</div>;
}
