'use client';

import type { CSSProperties } from 'react';

import { EmbedShellPlaybackModeProvider } from '../../contexts/EmbedPlaybackMode';
import { useEmbedSinglePlaybackLoad } from '../../hooks/useEmbedSinglePlaybackLoad';
import { embedAspectRatioToCssValue } from '../../lib/embed/embedAspectRatio';
import type { EmbedPresentationQuery, EmbedSharedQueryParams } from '../../lib/embed/embedTypes';
import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { EmbedPlayerPanel } from './EmbedPlayerPanel';

import styles from '../../styles/components/embed/EmbedSingleShell.module.scss';

type EmbedSingleShellProps = {
  resource: EmbedSingleResourcePayload;
  sharedQuery: EmbedSharedQueryParams;
  mediaPreference: EmbedPresentationQuery;
};

export function EmbedSingleShell({
  resource,
  sharedQuery,
  mediaPreference,
}: EmbedSingleShellProps) {
  const { playerSize } = sharedQuery;
  const isResponsivePlayer = playerSize === 'responsive';
  const responsiveShellStyle: CSSProperties | undefined = isResponsivePlayer
    ? ({
        '--embed-video-aspect-ratio': embedAspectRatioToCssValue(sharedQuery.aspectRatio),
      } as CSSProperties)
    : undefined;

  useEmbedSinglePlaybackLoad(resource, sharedQuery, true, mediaPreference);

  return (
    <EmbedShellPlaybackModeProvider playerSize={playerSize}>
      <section
        className={isResponsivePlayer ? `${styles.shell} ${styles.shellResponsive}` : styles.shell}
        data-testid="embed-single-shell"
        style={responsiveShellStyle}
      >
        <EmbedPlayerPanel
          fallbackResource={resource}
          panelLayout="single"
          playerSize={playerSize}
          sharedQuery={sharedQuery}
        />
      </section>
    </EmbedShellPlaybackModeProvider>
  );
}
