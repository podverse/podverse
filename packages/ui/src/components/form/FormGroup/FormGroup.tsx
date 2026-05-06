import type { ReactNode } from 'react';

import styles from './FormGroup.module.scss';

export type FormGroupProps = {
  children: ReactNode;
  className?: string;
};

/** Vertical spacing wrapper for a label + control (or related controls) inside a form. */
export function FormGroup({ children, className = '' }: FormGroupProps) {
  const combinedClassName = `${styles.formGroup} ${className}`.trim();
  return <div className={combinedClassName}>{children}</div>;
}
