'use client';

import React from 'react';

import { InfoWrapper } from '@podverse/ui';

import styles from '../../styles/components/NoResults/NoResults.module.scss';

type NoResultsProps = {
  message?: string;
};

export const NoResults: React.FC<NoResultsProps> = ({ message }) => {
  const displayMessage = message || 'No results found';

  return (
    <div>
      <InfoWrapper>
        <p className={styles.noResultsText}>{displayMessage}</p>
      </InfoWrapper>
    </div>
  );
};
