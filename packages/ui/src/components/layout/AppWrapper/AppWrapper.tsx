import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './AppWrapper.module.scss';

export type AppWrapperProps = {
  children: ReactNode;
  className?: string;
  /**
   * Flex direction for the main app chrome region.
   * Use `row` for sidebar + main (podverse-web); `column` for content below a full-width header
   * (e.g. management-web).
   */
  direction?: 'row' | 'column';
};

export function AppWrapper({ children, className, direction = 'row' }: AppWrapperProps) {
  return (
    <div
      className={classNames(
        styles.appWrapper,
        direction === 'column' ? styles.directionColumn : styles.directionRow,
        className
      )}
    >
      {children}
    </div>
  );
}
