'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@podverse/ui';

import styles from '../../styles/components/embed/EmbedLiveItemStatus.module.scss';

export function EmbedLiveItemStatus() {
  const tMedia = useTranslations('media');

  return (
    <Button
      className={styles.button}
      data-testid="embed-live-item-status"
      tabIndex={-1}
      variant="miniGlowDanger"
    >
      {tMedia('livestream.live')}
    </Button>
  );
}
