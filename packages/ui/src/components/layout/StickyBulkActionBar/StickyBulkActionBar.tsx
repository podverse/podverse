import classNames from 'classnames';
import type { HTMLAttributes, ReactNode } from 'react';

import styles from './StickyBulkActionBar.module.scss';

export type StickyBulkActionBarProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: ReactNode;
};

/** Sticks to the bottom of the scroll container; use for bulk actions when list rows are selected. */
export function StickyBulkActionBar({ children, className, ...rest }: StickyBulkActionBarProps) {
  return (
    <div aria-live="polite" className={classNames(styles.root, className)} role="region" {...rest}>
      {children}
    </div>
  );
}
