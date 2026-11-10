'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { Button } from '@podverse/ui';

import { NoResults } from '../NoResults/NoResults';

import styles from '../../styles/components/Browse/BrowseEmptyResults.module.scss';

type BrowseEmptyResultsProps = {
  message: string;
  /** When Top has no rows, offer the shortcut to Recent. */
  onBrowseByRecent?: () => void;
};

/**
 * Browse empty banner. While Top is selected, a button under the message switches to Recent so
 * the directory is not a dead end when the popularity window has no counts.
 */
export const BrowseEmptyResults: React.FC<BrowseEmptyResultsProps> = ({
  message,
  onBrowseByRecent,
}) => {
  const tBrowse = useTranslations('features.browse');

  return (
    <div className={styles.root}>
      <NoResults message={message} />
      {onBrowseByRecent !== undefined ? (
        <div data-testid="browse-by-recent">
          <Button block onClick={onBrowseByRecent} type="button" variant="primary">
            {tBrowse('browse_by_most_recent')}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
