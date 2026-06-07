'use client';

import { useTranslations } from 'next-intl';

import styles from '../../styles/components/embed/EmbedVideoPlaceholder.module.scss';

export function EmbedVideoPlaceholder() {
  const tFeatures = useTranslations('features');

  return (
    <p className={styles.placeholder} data-testid="embed-video-placeholder">
      {tFeatures('embed_video_coming_soon')}
    </p>
  );
}
