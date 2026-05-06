import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './StatusBadge.module.scss';

export type StatusBadgeVariant = 'neutral' | 'success' | 'warning' | 'danger';

export type StatusBadgeProps = {
  children: ReactNode;
  variant?: StatusBadgeVariant;
  className?: string;
};

export function StatusBadge({ children, variant = 'neutral', className }: StatusBadgeProps) {
  return <span className={classNames(styles.badge, styles[variant], className)}>{children}</span>;
}
