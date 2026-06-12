'use client';

import { useTranslations } from 'next-intl';

import { LoadingSpinner } from '@podverse/ui';

import styles from '../../styles/components/embed/EmbedPlayerLoadingOverlay.module.scss';

type EmbedPlayerLoadingOverlayProps = {
  isLoading: boolean;
};

export function EmbedPlayerLoadingOverlay({ isLoading }: EmbedPlayerLoadingOverlayProps) {
  const tMisc = useTranslations('misc');

  if (!isLoading) {
    return null;
  }

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={styles.overlay}
      data-testid="embed-player-loading"
    >
      <LoadingSpinner ariaLabel={tMisc('loading')} size="large" />
    </div>
  );
}
