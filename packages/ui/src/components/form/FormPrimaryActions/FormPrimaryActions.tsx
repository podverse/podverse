'use client';

import styles from './FormPrimaryActions.module.scss';

export type FormPrimaryActionsProps = {
  children: React.ReactNode;
};

/**
 * Right-aligned form footer: place secondary / Cancel first, primary submit last (DOM order).
 */
export function FormPrimaryActions({ children }: FormPrimaryActionsProps) {
  return <div className={styles.actions}>{children}</div>;
}
