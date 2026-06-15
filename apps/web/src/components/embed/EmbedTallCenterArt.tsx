'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { ImageNonReact } from '@podverse/ui';

import { IMAGES } from '../../constants/images';
import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../contexts/MediaPlayerCurrentTime';
import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { resolveEmbedActiveChapterForArtwork } from '../../lib/embed/resolveEmbedActiveChapterForArtwork';
import { resolveEmbedPlaybackSegmentRefs } from '../../lib/embed/resolveEmbedPlaybackSegmentRefs';
import { shouldEmbedShowChapterInfo } from '../../lib/embed/shouldEmbedShowChapterInfo';
import {
  buildMediaPlayerArtworkImageCandidates,
  getMediaPlayerArtworkSources,
  shouldUseChapterArtwork,
} from '../../utils/mediaPlayer/mediaPlayerArtwork';

import styles from '../../styles/components/embed/EmbedTallCenterArt.module.scss';

type EmbedTallCenterArtProps = {
  fallbackResource: EmbedSingleResourcePayload | null;
};

export function EmbedTallCenterArt({ fallbackResource }: EmbedTallCenterArtProps) {
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const { mpChannel, mpItem, mpAddByRSS, mpClip, mpItemSoundbite, mpItemChapter, mpItemChapters } =
    useMediaPlayer();
  const tMediaPlayer = useTranslations('media_player');

  const hasPlayerContent = mpChannel !== null || mpAddByRSS !== null;
  const { clip, itemSoundbite } = resolveEmbedPlaybackSegmentRefs({
    hasPlayerContent,
    mpClip,
    mpItemSoundbite,
    fallbackClip: fallbackResource?.clip ?? null,
    fallbackItemSoundbite: fallbackResource?.itemSoundbite ?? null,
  });

  const showChapterInfo = shouldEmbedShowChapterInfo({ clip, itemSoundbite });

  const { channelImages, itemImages } = getMediaPlayerArtworkSources({
    mpChannel: mpChannel ?? fallbackResource?.channel ?? null,
    mpItem: mpItem ?? fallbackResource?.item ?? null,
    mpAddByRSSResourceData: mpAddByRSS?.resourceData,
  });

  const activeChapterForArtwork = useMemo(
    () =>
      resolveEmbedActiveChapterForArtwork({
        showChapterInfo,
        preferItemTitle: false,
        mpItemChapters: showChapterInfo ? mpItemChapters : null,
        mpCurrentTimeSeconds: mpCurrentTime,
        mpItemChapter: showChapterInfo ? mpItemChapter : null,
        fallbackItemChapter: fallbackResource?.itemChapter ?? null,
      }),
    [showChapterInfo, mpItemChapters, mpCurrentTime, mpItemChapter, fallbackResource?.itemChapter]
  );

  const artImageCandidates = useMemo(() => {
    const candidates = buildMediaPlayerArtworkImageCandidates({
      channelImages,
      itemImages,
      chapterImageUrl: activeChapterForArtwork?.img,
      includeChapterImage: shouldUseChapterArtwork({
        mpItemChapter: activeChapterForArtwork,
        mpClip: clip,
        mpItemSoundbite: itemSoundbite,
      }),
      imageSizeTarget: IMAGES.MEDIA_PLAYER.DESKTOP.MINI.SIZE_FIND_TARGET,
      imageSizeComparison: 'greater',
    });

    const fallback = IMAGES.SRC.EMBED_PLACEHOLDER;
    if (candidates.length === 0) {
      return [fallback];
    }

    if (candidates[candidates.length - 1] !== fallback) {
      return [...candidates, fallback];
    }

    return candidates;
  }, [activeChapterForArtwork, channelImages, clip, itemImages, itemSoundbite]);

  return (
    <div className={styles.centerArtContainer} data-testid="embed-tall-center-art">
      <div className={styles.centerArtFrame}>
        <ImageNonReact
          alt={tMediaPlayer('media_player_image')}
          candidates={artImageCandidates}
          className={styles.centerArtImage}
          skipProxy
        />
      </div>
    </div>
  );
}
