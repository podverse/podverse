import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './Banner.module.scss';

export type BannerVariant = 'danger';

export type BannerProps = {
  /** Primary message — localize in the app before passing. */
  message: ReactNode;
  /** Optional trailing action (e.g. `next/link` or a button) — localize in the app. */
  action?: ReactNode;
  variant?: BannerVariant;
  role?: 'alert' | 'status';
  className?: string;
};

/** Full-width horizontal banner with optional trailing action; no default strings. */
export function Banner({ message, action, variant = 'danger', role, className }: BannerProps) {
  const hasAction = action !== undefined && action !== null;

  return (
    <div
      className={classNames(styles.root, variant === 'danger' && styles.danger, className)}
      role={role}
    >
      <div className={styles.message}>{message}</div>
      {hasAction ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
