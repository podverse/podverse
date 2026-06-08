'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { FaListOl } from 'react-icons/fa6';

import { ImageNonReact } from '@podverse/ui';

import { IMAGES } from '../../constants/images';
import { useConfig } from '../../contexts/Config';
import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../contexts/MediaPlayerCurrentTime';
import { buildEmbedMainSiteUrl } from '../../lib/embed/buildEmbedMainSiteUrl';
import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { formatEmbedDisplayTitle } from '../../lib/embed/formatEmbedDisplayTitle';
import { resolveEmbedActiveChapterForArtwork } from '../../lib/embed/resolveEmbedActiveChapterForArtwork';
import { resolveEmbedPrimaryTitle } from '../../lib/embed/resolveEmbedPrimaryTitle';
import { shouldEmbedShowChapterInfo } from '../../lib/embed/shouldEmbedShowChapterInfo';
import { getBrandLogoSquareSrc } from '../../utils/brandLogo';
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
  const pathname = usePathname();
  const config = useConfig();
  const brandLogoSquareSrc = getBrandLogoSquareSrc();
  const mainSiteUrl = buildEmbedMainSiteUrl(pathname);
  const { mpChannel, mpItem, mpAddByRSS, mpItemChapter, mpItemChapters, mpClip, mpItemSoundbite } =
    useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const tFeatures = useTranslations('features');
  const tMediaPlayer = useTranslations('media_player');
  const tMisc = useTranslations('misc');

  const hasPlayerContent = mpChannel !== null || mpAddByRSS !== null;
  const channel = mpChannel ?? fallbackResource?.channel ?? null;
  const item = mpItem ?? fallbackResource?.item ?? null;
  const clip = mpClip ?? fallbackResource?.clip ?? null;
  const itemSoundbite = mpItemSoundbite ?? fallbackResource?.itemSoundbite ?? null;
  const showChapterInfo = shouldEmbedShowChapterInfo({
    mpClip,
    mpItemSoundbite,
    fallbackClip: fallbackResource?.clip ?? null,
    fallbackItemSoundbite: fallbackResource?.itemSoundbite ?? null,
  });

  const infoResolution = hasPlayerContent
    ? getMediaPlayerInfoResolution({
        mpChannel,
        mpItem,
        mpAddByRSS,
        mpClip: clip,
        mpItemSoundbite: itemSoundbite,
        mpItemChapter: showChapterInfo ? mpItemChapter : null,
        mpItemChapters: showChapterInfo ? mpItemChapters : null,
        currentTimeSeconds: mpCurrentTime,
      })
    : null;

  const channelTitle =
    infoResolution?.channelTitle ??
    channel?.title ??
    (headerTitle !== null && headerTitle !== undefined && headerTitle !== '' ? headerTitle : null);

  const [preferItemTitle, setPreferItemTitle] = useState(false);

  useEffect(() => {
    setPreferItemTitle(false);
  }, [mpItem?.id_text]);

  const primaryTitleResolution = hasPlayerContent
    ? resolveEmbedPrimaryTitle({
        mpItem,
        mpClip: clip,
        mpItemSoundbite: itemSoundbite,
        mpItemChapters: showChapterInfo ? mpItemChapters : null,
        currentTimeSeconds: mpCurrentTime,
        preferItemTitle,
      })
    : null;

  const itemTitle = hasPlayerContent
    ? (primaryTitleResolution?.title ?? infoResolution?.itemTitle ?? tMisc('untitled'))
    : fallbackResource !== null
      ? formatEmbedDisplayTitle(fallbackResource)
      : null;

  const allowTitleToggle = primaryTitleResolution?.allowTitleToggle === true;

  const showChapterTitleIcon = hasPlayerContent
    ? primaryTitleResolution?.showChapterTitleIcon === true
    : showChapterInfo && fallbackResource?.itemChapter !== null;

  const publishDate = item?.pub_date ?? null;

  const { channelImages, itemImages } = getMediaPlayerArtworkSources({
    mpChannel: channel,
    mpItem: item,
    mpAddByRSSResourceData: mpAddByRSS?.resourceData,
  });

  const activeChapterForArtwork = useMemo(
    () =>
      resolveEmbedActiveChapterForArtwork({
        showChapterInfo,
        preferItemTitle,
        mpItemChapters: showChapterInfo ? mpItemChapters : null,
        mpCurrentTimeSeconds: mpCurrentTime,
        mpItemChapter: showChapterInfo ? mpItemChapter : null,
        fallbackItemChapter: fallbackResource?.itemChapter ?? null,
      }),
    [
      showChapterInfo,
      preferItemTitle,
      mpItemChapters,
      mpCurrentTime,
      mpItemChapter,
      fallbackResource?.itemChapter,
    ]
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
          {allowTitleToggle ? (
            <button
              className={styles.infoToggleButton}
              data-testid="embed-title-toggle"
              type="button"
              onClick={() => setPreferItemTitle((current) => !current)}
            >
              {channelTitle !== null && channelTitle !== '' ? (
                <span className={styles.channelTitle} data-testid="embed-channel-title">
                  {channelTitle}
                </span>
              ) : null}
              {itemTitle !== null && itemTitle !== '' ? (
                <span className={styles.titleRow}>
                  {showChapterTitleIcon ? (
                    <FaListOl
                      aria-hidden
                      className={styles.chapterTitleIcon}
                      data-testid="embed-chapter-title-icon"
                    />
                  ) : null}
                  <span className={styles.title}>{itemTitle}</span>
                </span>
              ) : null}
              {publishDate !== null && publishDate !== '' ? (
                <span className={styles.publishDateBadge} data-testid="embed-publish-date">
                  <ReadableDate date={publishDate} />
                </span>
              ) : null}
            </button>
          ) : (
            <div className={styles.textStack}>
              {channelTitle !== null && channelTitle !== '' ? (
                <span className={styles.channelTitle} data-testid="embed-channel-title">
                  {channelTitle}
                </span>
              ) : null}
              {itemTitle !== null && itemTitle !== '' ? (
                <span className={styles.titleRow}>
                  {showChapterTitleIcon ? (
                    <FaListOl
                      aria-hidden
                      className={styles.chapterTitleIcon}
                      data-testid="embed-chapter-title-icon"
                    />
                  ) : null}
                  <span className={styles.title} data-testid="embed-title">
                    {itemTitle}
                  </span>
                </span>
              ) : null}
              {publishDate !== null && publishDate !== '' ? (
                <span className={styles.publishDateBadge} data-testid="embed-publish-date">
                  <ReadableDate date={publishDate} />
                </span>
              ) : null}
            </div>
          )}
          {brandLogoSquareSrc !== null && mainSiteUrl !== null ? (
            <a
              aria-label={tFeatures('embed_brand_logo_link', {
                brand_name: config.public.brand.name,
              })}
              className={styles.brandLogoLink}
              data-testid="embed-brand-logo-link"
              href={mainSiteUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ImageNonReact
                alt=""
                candidates={[brandLogoSquareSrc]}
                className={styles.brandLogo}
              />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
