import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './Card.module.scss';

export type CardProps = {
  children: ReactNode;
  variant?: 'default' | 'bordered';
  className?: string;
};

export function Card({ children, variant = 'default', className }: CardProps) {
  return (
    <div
      className={classNames(variant === 'bordered' ? styles.cardBordered : styles.card, className)}
    >
      {children}
    </div>
  );
}
