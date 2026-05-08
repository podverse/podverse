'use client';

import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './FilterTablePageLayout.module.scss';

export type FilterTablePageLayoutProps = {
  breadcrumbs?: ReactNode;
  children: ReactNode;
  error?: ReactNode;
  errorVariant?: 'error' | 'muted';
  headerActions?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
};

export function FilterTablePageLayout({
  breadcrumbs,
  children,
  error,
  errorVariant = 'muted',
  headerActions,
  subtitle,
  title,
}: FilterTablePageLayoutProps) {
  const showError = error !== undefined && error !== null && error !== '';

  return (
    <div className={styles.root}>
      {breadcrumbs !== undefined && breadcrumbs !== null ? breadcrumbs : null}
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle !== undefined && subtitle !== null ? (
            <p className={styles.subtitle}>{subtitle}</p>
          ) : null}
        </div>
        {headerActions !== undefined && headerActions !== null ? headerActions : null}
      </div>
      {showError ? (
        <div
          className={classNames(errorVariant === 'error' ? styles.errorStrong : styles.errorMuted)}
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {children}
    </div>
  );
}
