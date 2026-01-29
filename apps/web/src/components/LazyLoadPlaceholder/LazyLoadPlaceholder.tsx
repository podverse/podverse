'use client';

import { useTranslations } from 'next-intl';
import React from 'react';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import styles from '../../styles/components/LazyLoadPlaceholder/LazyLoadPlaceholder.module.scss';

export const LazyLoadPlaceholder: React.FC = () => {
  const tMisc = useTranslations('misc');
  return (
    <div
      className={styles.placeholder}
      role="status"
      aria-live="polite"
      aria-label={tMisc('loading')}
    >
      <LoadingSpinner />
    </div>
  );
};
