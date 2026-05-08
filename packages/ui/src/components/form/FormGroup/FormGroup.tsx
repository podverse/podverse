import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './FormGroup.module.scss';

export type FormGroupProps = {
  children: ReactNode;
  className?: string;
  /**
   * Use when this group is a direct child of {@link StackForm} / {@link FormStack} so spacing relies on
   * parent **`gap`** only.
   */
  layout?: 'default' | 'inStack';
};

/** Vertical spacing wrapper for a label + control (or related controls) inside a form. */
export function FormGroup({ children, className = '', layout = 'default' }: FormGroupProps) {
  return (
    <div
      className={classNames(
        styles.formGroup,
        layout === 'inStack' && styles.formGroupInStack,
        className
      )}
    >
      {children}
    </div>
  );
}
