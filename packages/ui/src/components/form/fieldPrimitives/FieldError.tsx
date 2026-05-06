import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './FieldPrimitives.module.scss';

export type FieldErrorProps = {
  children: ReactNode;
  id?: string;
  className?: string;
};

export function FieldError({ children, id, className }: FieldErrorProps) {
  return (
    <p id={id} role="alert" className={classNames(styles.fieldError, className)}>
      {children}
    </p>
  );
}
