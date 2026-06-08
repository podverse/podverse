'use client';

import { useTranslations } from 'next-intl';

import styles from '../../styles/components/embed/EmbedNotAvailableShell.module.scss';

export function EmbedNotAvailableShell() {
  const tFeatures = useTranslations('features');

  return (
    <section className={styles.shell} data-testid="embed-not-available">
      <div className={styles.messageRegion}>
        <div className={styles.message}>{tFeatures('embed_not_available')}</div>
      </div>
    </section>
  );
}
