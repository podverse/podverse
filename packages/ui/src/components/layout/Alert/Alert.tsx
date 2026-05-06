import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './Alert.module.scss';

export type AlertProps = {
  children: ReactNode;
  variant?: 'error' | 'success' | 'default';
  className?: string;
};

export function Alert({ children, variant = 'error', className }: AlertProps) {
  return (
    <div
      className={classNames(
        styles.alert,
        variant === 'error' && styles.alertError,
        variant === 'success' && styles.alertSuccess,
        className
      )}
    >
      {children}
    </div>
  );
}
