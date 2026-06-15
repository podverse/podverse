'use client';

import { useMemo } from 'react';

import { formatHHMMSS } from '@podverse/helpers';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../contexts/MediaPlayerCurrentTime';
import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { resolveEmbedActiveSegmentInfo } from '../../lib/embed/resolveEmbedActiveSegmentInfo';

import styles from '../../styles/components/embed/EmbedSegmentInfoBar.module.scss';

type EmbedSegmentInfoBarProps = {
  fallbackResource: EmbedSingleResourcePayload | null;
};

function formatSegmentTimeRange(startSeconds: number, endSeconds: number | null): string {
  const startLabel = formatHHMMSS(startSeconds);
  if (endSeconds === null) {
    return startLabel;
  }

  return `${startLabel} – ${formatHHMMSS(endSeconds)}`;
}

export function EmbedSegmentInfoBar({ fallbackResource }: EmbedSegmentInfoBarProps) {
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const { mpChannel, mpAddByRSS, mpClip, mpItemSoundbite, mpItemChapter, mpItemChapters } =
    useMediaPlayer();
  const hasPlayerContent = mpChannel !== null || mpAddByRSS !== null;

  const segmentInfo = useMemo(
    () =>
      resolveEmbedActiveSegmentInfo({
        currentTimeSeconds: mpCurrentTime,
        fallbackChapter: fallbackResource?.itemChapter ?? null,
        fallbackClip: fallbackResource?.clip ?? null,
        fallbackSoundbite: fallbackResource?.itemSoundbite ?? null,
        hasPlayerContent,
        mpClip,
        mpItemChapter,
        mpItemChapters,
        mpItemSoundbite,
      }),
    [
      fallbackResource?.clip,
      fallbackResource?.itemChapter,
      fallbackResource?.itemSoundbite,
      hasPlayerContent,
      mpClip,
      mpCurrentTime,
      mpItemChapter,
      mpItemChapters,
      mpItemSoundbite,
    ]
  );

  if (segmentInfo === null) {
    return null;
  }

  return (
    <div className={styles.segmentBar} data-testid="embed-segment-info-bar">
      <span className={styles.title}>{segmentInfo.title}</span>
      <span className={styles.timeRange}>
        {formatSegmentTimeRange(segmentInfo.startSeconds, segmentInfo.endSeconds)}
      </span>
    </div>
  );
}
