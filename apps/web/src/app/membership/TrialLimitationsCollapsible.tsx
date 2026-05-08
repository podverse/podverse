'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { InlineTextButton } from '../../components/InlineTextButton/InlineTextButton';

import styles from '../../styles/app/membership/Membership.module.scss';

const TRIAL_LIMITATIONS_DETAILS_DOM_ID = 'trial-limitations-details';

export function TrialLimitationsCollapsible() {
  const t = useTranslations('membership');
  const [expanded, setExpanded] = useState(false);

  return (
    <section className={styles.trialLimitationsSubtle} aria-label={t('trial_limitations_title')}>
      <p className={styles.trialLimitationsSummary}>
        <span>{t('trial_limitations_summary')} </span>
        <InlineTextButton
          aria-controls={expanded ? TRIAL_LIMITATIONS_DETAILS_DOM_ID : undefined}
          aria-expanded={expanded}
          type="button"
          onClick={() => {
            setExpanded((value) => !value);
          }}
        >
          {expanded ? t('trial_limitations_show_less') : t('trial_limitations_show_more')}
        </InlineTextButton>
      </p>
      {expanded ? (
        <ul className={styles.trialLimitationsListExpanded} id={TRIAL_LIMITATIONS_DETAILS_DOM_ID}>
          <li>{t('trial_limitations_directory_add_by_rss')}</li>
          <li>{t('trial_limitations_add_by_rss_feed_limit')}</li>
          <li>{t('trial_limitations_manual_refresh_limit')}</li>
          <li>{t('trial_limitations_stats_tracking')}</li>
          <li>{t('trial_limitations_notifications')}</li>
        </ul>
      ) : null}
    </section>
  );
}
