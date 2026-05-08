import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './ConfirmPanel.module.scss';

export type ConfirmPanelProps = {
  children: ReactNode;
  className?: string;
};

export function ConfirmPanel({ children, className }: ConfirmPanelProps) {
  return <div className={classNames(styles.root, className)}>{children}</div>;
}
