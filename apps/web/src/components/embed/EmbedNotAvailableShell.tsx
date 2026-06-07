'use client';

import { useTranslations } from 'next-intl';

import { EmbedFooter } from './EmbedFooter';

import styles from '../../styles/components/embed/EmbedNotAvailableShell.module.scss';

export function EmbedNotAvailableShell() {
  const tFeatures = useTranslations('features');

  return (
    <section className={styles.shell} data-testid="embed-not-available">
      <div className={styles.messageRegion}>
        <p className={styles.message}>{tFeatures('embed_not_available')}</p>
      </div>
      <EmbedFooter />
    </section>
  );
}
