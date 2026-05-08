import type { ReactNode } from 'react';

import styles from './CheckboxFieldList.module.scss';

export type CheckboxFieldListProps = {
  children: ReactNode;
  className?: string;
  /** Same small title line as {@link TextInput} `eyebrow` (in-control field label). */
  eyebrow?: string;
};

/** Vertical stack for CheckboxField rows (tight gap; optional `eyebrow` matches TextInput/FormDropdown). */
export function CheckboxFieldList({ children, className = '', eyebrow }: CheckboxFieldListProps) {
  const rootClass = `${styles.root} ${className}`.trim();
  return (
    <div className={rootClass}>
      {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
      {children}
    </div>
  );
}
