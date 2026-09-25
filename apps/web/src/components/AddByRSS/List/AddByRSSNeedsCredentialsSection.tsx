'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React, { useId } from 'react';

import { Divider } from '@podverse/ui';

import { ROUTES } from '../../../constants/routes';
import type { AddByRSSNeedsCredentialsFeed } from '../../../utils/addByRSS/credentialsStatus';

import styles from '../../../styles/components/AddByRSS/List/AddByRSSNeedsCredentialsSection.module.scss';

type AddByRSSNeedsCredentialsSectionProps = {
  feeds: AddByRSSNeedsCredentialsFeed[];
};

/**
 * Followed feeds this browser cannot read yet. Rows open the credentials page rather than the
 * feed detail, since there is nothing to show until the feed parses with credentials.
 */
export const AddByRSSNeedsCredentialsSection: React.FC<AddByRSSNeedsCredentialsSectionProps> = ({
  feeds,
}) => {
  const tFeatures = useTranslations('features');
  const headingId = useId();

  if (feeds.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.section}
      aria-labelledby={headingId}
      data-testid="add-by-rss-needs-credentials-section"
    >
      <h2 id={headingId} className={styles.heading}>
        {tFeatures('add_by_rss.needs_credentials_section_title')}
      </h2>
      <ul className={styles.list}>
        {feeds.map(({ feed, need }, idx) => {
          const title = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;
          const isRejected = need === 'rejected';
          return (
            <li key={feed.idText}>
              <Link
                href={`${ROUTES.ADD_BY_RSS_CREDENTIALS}/${feed.idText}`}
                className={styles.link}
              >
                <span className={styles.title}>{title}</span>
                <span
                  className={
                    isRejected ? `${styles.subtitle} ${styles.subtitleRejected}` : styles.subtitle
                  }
                >
                  {tFeatures(
                    isRejected
                      ? 'add_by_rss.needs_credentials_rejected'
                      : 'add_by_rss.needs_credentials_missing'
                  )}
                </span>
              </Link>
              {idx < feeds.length - 1 && <Divider />}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
