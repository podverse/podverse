import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './Alert.module.scss';

export type AlertProps = {
  children: ReactNode;
  variant?: 'error' | 'success' | 'default';
  className?: string;
  /** When true, renders the alert shell even if `children` is null, undefined, or `''`. */
  renderWhenEmpty?: boolean;
};

export function Alert({
  children,
  variant = 'error',
  className,
  renderWhenEmpty = false,
}: AlertProps) {
  if (!renderWhenEmpty && (children === null || children === undefined || children === '')) {
    return null;
  }

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
