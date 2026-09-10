'use client';

import { useTranslations } from 'next-intl';

import { Accordion } from '@podverse/ui';

import styles from '../../styles/app/membership/Membership.module.scss';

const TRIAL_LIMITATION_KEYS = [
  'trial_limitations_directory_add_by_rss',
  'trial_limitations_add_by_rss_feed_limit',
  'trial_limitations_manual_refresh_limit',
  'trial_limitations_stats_tracking',
] as const;

export function TrialLimitationsCollapsible() {
  const t = useTranslations('membership');

  return (
    <section className={styles.trialLimitationsAccordion}>
      <Accordion
        className={styles.trialLimitationsShell}
        contentClassName={styles.trialLimitationsContent}
        header={t('trial_limitations_title')}
        headerClassName={styles.trialLimitationsHeader}
      >
        <p className={styles.trialLimitationsIntro}>{t('trial_limitations_summary')}</p>
        <ul className={styles.trialLimitationsList}>
          {TRIAL_LIMITATION_KEYS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </Accordion>
    </section>
  );
}
