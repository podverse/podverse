'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { InfoWrapper } from '@podverse/ui';

import styles from '../../styles/components/NoResults/NoResults.module.scss';

type NoResultsProps = {
  message?: string;
  /** Polite announcement when a list has settled empty. */
  role?: 'status';
};

export const NoResults: React.FC<NoResultsProps> = ({ message, role }) => {
  const t = useTranslations('features.search');
  const displayMessage = message || t('no_results');

  return (
    <div>
      <InfoWrapper>
        <p className={styles.noResultsText} role={role}>
          {displayMessage}
        </p>
      </InfoWrapper>
    </div>
  );
};
