import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './Callout.module.scss';

export type CalloutProps = {
  children: ReactNode;
  className?: string;
};

/** Toned container that separates content from the surrounding layout. */
export function Callout({ children, className }: CalloutProps) {
  return <div className={classNames(styles.callout, className)}>{children}</div>;
}
