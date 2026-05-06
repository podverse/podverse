import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './LoadingText.module.scss';

export type LoadingTextProps = {
  children: ReactNode;
  className?: string;
};

export function LoadingText({ children, className }: LoadingTextProps) {
  return <p className={classNames(styles.loadingText, className)}>{children}</p>;
}
