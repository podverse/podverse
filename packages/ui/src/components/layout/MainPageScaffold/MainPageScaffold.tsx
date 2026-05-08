import classNames from 'classnames';
import type { ReactNode } from 'react';
import React from 'react';

import { Divider } from '../Divider/Divider';

import styles from './MainPageScaffold.module.scss';

export type MainPageScaffoldProps = {
  children: ReactNode;
  emptyStateComponent?: ReactNode;
  footer: ReactNode;
  className?: string;
  /**
   * Outer scroll container id (e.g. podverse-web Boost messages anchor).
   * @default 'mainOuterWrapper'
   */
  outerId?: string;
};

export function MainPageScaffold({
  children,
  emptyStateComponent,
  footer,
  className,
  outerId = 'mainOuterWrapper',
}: MainPageScaffoldProps) {
  return (
    <div id={outerId} className={classNames(styles.mainOuterWrapper, className)}>
      <main className={styles.main}>
        {React.Children.count(children) > 0 ? (
          children
        ) : emptyStateComponent ? (
          <div className={styles.emptyStateWrapper}>{emptyStateComponent}</div>
        ) : null}
      </main>
      <Divider />
      {footer}
    </div>
  );
}
