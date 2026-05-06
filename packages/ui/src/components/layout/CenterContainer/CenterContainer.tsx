import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './CenterContainer.module.scss';

export type CenterContainerProps = {
  children: ReactNode;
  className?: string;
};

export function CenterContainer({ children, className }: CenterContainerProps) {
  return <div className={classNames(styles.centerContainer, className)}>{children}</div>;
}
