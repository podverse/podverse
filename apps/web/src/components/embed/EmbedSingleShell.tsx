'use client';

import { useEmbedSinglePlaybackLoad } from '../../hooks/useEmbedSinglePlaybackLoad';
import type { EmbedMediaType, EmbedSharedQueryParams } from '../../lib/embed/embedTypes';
import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { EmbedPlayerPanel } from './EmbedPlayerPanel';

import styles from '../../styles/components/embed/EmbedSingleShell.module.scss';

type EmbedSingleShellProps = {
  resource: EmbedSingleResourcePayload;
  sharedQuery: EmbedSharedQueryParams;
  mediaType: EmbedMediaType;
};

export function EmbedSingleShell({ resource, sharedQuery, mediaType }: EmbedSingleShellProps) {
  const isAudio = mediaType === 'audio';

  useEmbedSinglePlaybackLoad(resource, sharedQuery, isAudio);

  return (
    <section
      className={mediaType === 'video' ? `${styles.shell} ${styles.shellVideo}` : styles.shell}
      data-testid="embed-single-shell"
    >
      <EmbedPlayerPanel fallbackResource={resource} mediaType={mediaType} panelLayout="single" />
    </section>
  );
}
