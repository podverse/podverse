import type { ReactNode } from 'react';

import styles from './FormStack.module.scss';

export type FormStackProps = {
  children: ReactNode;
  className?: string;
};

export function FormStack({ children, className = '' }: FormStackProps) {
  return <div className={[styles.stack, className].filter(Boolean).join(' ')}>{children}</div>;
}
