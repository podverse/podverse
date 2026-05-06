import classNames from 'classnames';
import type { ReactNode } from 'react';

import { Card } from '../Card/Card';

import styles from './AuthCard.module.scss';

export type AuthCardProps = {
  children: ReactNode;
  className?: string;
};

export function AuthCard({ children, className }: AuthCardProps) {
  return <Card className={classNames(styles.authCard, className)}>{children}</Card>;
}

export type AuthCardHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
};

export function AuthCardHeader({ title, subtitle }: AuthCardHeaderProps) {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {subtitle !== null && subtitle !== undefined && subtitle !== '' ? (
        <p className={styles.subtitle}>{subtitle}</p>
      ) : null}
    </div>
  );
}
