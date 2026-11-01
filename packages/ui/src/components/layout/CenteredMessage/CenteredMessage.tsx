import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './CenteredMessage.module.scss';

export type CenteredMessageProps = {
  children: ReactNode;
  className?: string;
  /** Polite status, or an alert when the screen is a failure. */
  live?: 'status' | 'alert';
  tone?: 'default' | 'danger';
};

/**
 * Sits at the start of the page column. Use when the screen is only a message (and, optionally,
 * a spinner or one action).
 */
export function CenteredMessage({
  children,
  className,
  live,
  tone = 'default',
}: CenteredMessageProps) {
  return (
    <div className={classNames(styles.root, className)} role={live}>
      <div className={classNames(styles.content, tone === 'danger' && styles.toneDanger)}>
        {children}
      </div>
    </div>
  );
}
