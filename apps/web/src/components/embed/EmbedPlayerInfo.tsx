'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { ImageNonReact } from '@podverse/ui';

import { IMAGES } from '../../constants/images';
import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../contexts/MediaPlayerCurrentTime';
import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { formatEmbedDisplayTitle } from '../../lib/embed/formatEmbedDisplayTitle';
import {
  buildMediaPlayerArtworkImageCandidates,
  getMediaPlayerArtworkSources,
  shouldUseChapterArtwork,
} from '../../utils/mediaPlayer/mediaPlayerArtwork';
import { getMediaPlayerInfoResolution } from '../../utils/mediaPlayer/mediaPlayerInfoResolution';
import { ReadableDate } from '../Time/ReadableDate';

import styles from '../../styles/components/embed/EmbedPlayerInfo.module.scss';

type EmbedPlayerInfoProps = {
  fallbackResource: EmbedSingleResourcePayload | null;
  headerTitle?: string | null;
};

export function EmbedPlayerInfo({ fallbackResource, headerTitle }: EmbedPlayerInfoProps) {
  const { mpChannel, mpItem, mpAddByRSS, mpItemChapter, mpItemChapters, mpClip, mpItemSoundbite } =
    useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const tMediaPlayer = useTranslations('media_player');
  const tMisc = useTranslations('misc');

  const hasPlayerContent = mpChannel !== null || mpAddByRSS !== null;
  const channel = mpChannel ?? fallbackResource?.channel ?? null;
  const item = mpItem ?? fallbackResource?.item ?? null;
  const clip = mpClip ?? fallbackResource?.clip ?? null;
  const itemChapter = mpItemChapter ?? fallbackResource?.itemChapter ?? null;
  const itemSoundbite = mpItemSoundbite ?? fallbackResource?.itemSoundbite ?? null;

  const infoResolution = hasPlayerContent
    ? getMediaPlayerInfoResolution({
        mpChannel,
        mpItem,
        mpAddByRSS,
        mpClip,
        mpItemSoundbite,
        mpItemChapter,
        mpItemChapters,
        currentTimeSeconds: mpCurrentTime,
      })
    : null;

  const channelTitle =
    infoResolution?.channelTitle ??
    channel?.title ??
    (headerTitle !== null && headerTitle !== undefined && headerTitle !== '' ? headerTitle : null);

  const itemTitle = hasPlayerContent
    ? (infoResolution?.itemTitle ?? tMisc('untitled'))
    : fallbackResource !== null
      ? formatEmbedDisplayTitle(fallbackResource)
      : null;

  const publishDate = item?.pub_date ?? null;

  const { channelImages, itemImages } = getMediaPlayerArtworkSources({
    mpChannel: channel,
    mpItem: item,
    mpAddByRSSResourceData: mpAddByRSS?.resourceData,
  });

  const artImageCandidates = useMemo(() => {
    const candidates = buildMediaPlayerArtworkImageCandidates({
      channelImages,
      itemImages,
      chapterImageUrl: itemChapter?.img,
      includeChapterImage: shouldUseChapterArtwork({
        mpItemChapter: itemChapter,
        mpClip: clip,
        mpItemSoundbite: itemSoundbite,
      }),
      imageSizeTarget: IMAGES.MEDIA_PLAYER.DESKTOP.MINI.SIZE_FIND_TARGET,
      imageSizeComparison: 'greater',
    });

    if (candidates.length === 0) {
      return [IMAGES.SRC.PLACEHOLDER];
    }

    return candidates;
  }, [channelImages, clip, itemChapter, itemImages, itemSoundbite]);

  if (
    (channelTitle === null || channelTitle === '') &&
    (itemTitle === null || itemTitle === '') &&
    artImageCandidates.length === 0
  ) {
    return null;
  }

  return (
    <div className={styles.info} data-testid="embed-player-info">
      <div className={styles.imageWrapper} data-testid="embed-artwork">
        <ImageNonReact
          alt={tMediaPlayer('media_player_image')}
          candidates={artImageCandidates}
          className={styles.image}
        />
      </div>
      <div className={styles.textSection}>
        {channelTitle !== null && channelTitle !== '' ? (
          <p className={styles.channelTitle} data-testid="embed-channel-title">
            {channelTitle}
          </p>
        ) : null}
        {itemTitle !== null && itemTitle !== '' ? (
          <p className={styles.title} data-testid="embed-title">
            {itemTitle}
          </p>
        ) : null}
        {publishDate !== null && publishDate !== '' ? (
          <span className={styles.publishDateBadge} data-testid="embed-publish-date">
            <ReadableDate date={publishDate} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
