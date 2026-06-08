'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { ImageNonReact } from '@podverse/ui';

import { IMAGES } from '../../constants/images';
import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../contexts/MediaPlayerCurrentTime';
import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { formatEmbedDisplayTitle } from '../../lib/embed/formatEmbedDisplayTitle';
import { getBrandLogoSrc } from '../../utils/brandLogo';
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
  const config = useConfig();
  const { uiTheme } = useLocalSettings();
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

    const fallback = IMAGES.SRC.EMBED_PLACEHOLDER;
    if (candidates.length === 0) {
      return [fallback];
    }

    if (candidates[candidates.length - 1] !== fallback) {
      return [...candidates, fallback];
    }

    return candidates;
  }, [channelImages, clip, itemChapter, itemImages, itemSoundbite]);

  // #region agent log
  useMemo(() => {
    fetch('http://127.0.0.1:7492/ingest/b00b7ad8-3302-43b6-ba18-0bcb911f8469', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '904d64' },
      body: JSON.stringify({
        sessionId: '904d64',
        runId: 'post-fix',
        hypothesisId: 'H1-H4',
        location: 'EmbedPlayerInfo.tsx:artImageCandidates',
        message: 'embed artwork sources and candidates',
        data: {
          channelImageUrls: channelImages?.map((img) => img.url) ?? [],
          itemImageUrls: itemImages?.map((img) => img.url) ?? [],
          artImageCandidates,
          hasPlayerContent,
          itemIdText: item?.id_text ?? null,
          channelIdText: channel?.id_text ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    return null;
  }, [artImageCandidates, channel?.id_text, channelImages, hasPlayerContent, item?.id_text, itemImages]);
  // #endregion

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
          skipProxy
        />
      </div>
      <div className={styles.textSection}>
        <div className={styles.titleAndLogoRow}>
          <div className={styles.titleStack}>
            {channelTitle !== null && channelTitle !== '' ? (
              <span className={styles.channelTitle} data-testid="embed-channel-title">
                {channelTitle}
              </span>
            ) : null}
            {itemTitle !== null && itemTitle !== '' ? (
              <span className={styles.title} data-testid="embed-title">
                {itemTitle}
              </span>
            ) : null}
          </div>
          <div className={styles.brandLogoWrapper} data-testid="embed-brand-logo">
            <ImageNonReact
              alt={config.public.brand.name}
              candidates={[getBrandLogoSrc(uiTheme)]}
              className={styles.brandLogo}
            />
          </div>
        </div>
        {publishDate !== null && publishDate !== '' ? (
          <span className={styles.publishDateBadge} data-testid="embed-publish-date">
            <ReadableDate date={publishDate} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
