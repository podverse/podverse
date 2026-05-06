import type { ReactNode } from 'react';

import styles from './CheckboxFieldList.module.scss';

export type CheckboxFieldListProps = {
  children: ReactNode;
  className?: string;
};

/** Vertical stack for CheckboxField rows (tight gap; use inside a labeled form group). */
export function CheckboxFieldList({ children, className = '' }: CheckboxFieldListProps) {
  const rootClass = `${styles.root} ${className}`.trim();
  return <div className={rootClass}>{children}</div>;
}
