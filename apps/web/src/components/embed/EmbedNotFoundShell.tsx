'use client';

import { useTranslations } from 'next-intl';

import styles from '../../styles/components/embed/EmbedNotFoundShell.module.scss';

export function EmbedNotFoundShell() {
  const tFeatures = useTranslations('features');

  return (
    <section className={styles.shell} data-testid="embed-not-found-shell">
      <div className={styles.messageRegion}>
        <div className={styles.message}>{tFeatures('embed_not_found')}</div>
      </div>
    </section>
  );
}
