'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { InfoWrapper } from '@podverse/ui';

import styles from '../../styles/components/NoResults/NoResults.module.scss';

type NoResultsProps = {
  message?: string;
};

export const NoResults: React.FC<NoResultsProps> = ({ message }) => {
  const t = useTranslations('features.search');
  const displayMessage = message || t('no_results');

  return (
    <div>
      <InfoWrapper>
        <p className={styles.noResultsText}>{displayMessage}</p>
      </InfoWrapper>
    </div>
  );
};
