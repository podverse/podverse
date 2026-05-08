'use client';

import { useTranslations } from 'next-intl';

import { ImageNonReact } from '@podverse/ui';

import { IMAGES } from '../../../constants/images';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';
import {
  buildMediaPlayerArtworkImageCandidates,
  getMediaPlayerArtworkSources,
  shouldUseChapterArtwork,
} from '../../../utils/mediaPlayer/mediaPlayerArtwork';
import { getMediaPlayerInfoResolution } from '../../../utils/mediaPlayer/mediaPlayerInfoResolution';

import styles from '../../../styles/components/MediaPlayer/Desktop/MediaPlayerInfoDesktop.module.scss';

export const MediaPlayerInfoDesktop: React.FC = () => {
  const {
    mpChannel,
    mpItem,
    mpAddByRSS,
    mpItemChapter,
    mpItemChapters,
    mpClip,
    mpItemSoundbite,
    setPlayerModalIsOpen,
  } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const tMediaPlayer = useTranslations('media_player');
  const tMisc = useTranslations('misc');

  const hasContent = !!mpChannel || !!mpAddByRSS;
  const infoResolution = getMediaPlayerInfoResolution({
    mpChannel,
    mpItem,
    mpAddByRSS,
    mpClip,
    mpItemSoundbite,
    mpItemChapter,
    mpItemChapters,
    currentTimeSeconds: mpCurrentTime,
  });
  const title = hasContent ? (infoResolution.itemTitle ?? tMisc('untitled')) : '';
  const subtitle = hasContent ? (infoResolution.channelTitle ?? tMisc('untitled')) : '';

  const { channelImages, itemImages } = getMediaPlayerArtworkSources({
    mpChannel,
    mpItem,
    mpAddByRSSResourceData: mpAddByRSS?.resourceData,
  });
  const artImageCandidates = buildMediaPlayerArtworkImageCandidates({
    channelImages,
    itemImages,
    chapterImageUrl: mpItemChapter?.img,
    includeChapterImage: shouldUseChapterArtwork({
      mpItemChapter,
      mpClip,
      mpItemSoundbite,
    }),
    imageSizeTarget: IMAGES.MEDIA_PLAYER.DESKTOP.MINI.SIZE_FIND_TARGET,
    imageSizeComparison: 'greater',
  });

  return (
    <div className={styles.info}>
      <button
        className={styles.button}
        aria-description={tMediaPlayer('show_fullscreen_media_player')}
        type="button"
        onClick={() => setPlayerModalIsOpen(true)}
      >
        <div className={styles.imageWrapper}>
          <ImageNonReact
            className={styles.image}
            candidates={artImageCandidates}
            alt={tMediaPlayer('media_player_image')}
          />
        </div>
        <div className={styles.textSection}>
          <div className={styles.title}>{title}</div>
          <div className={styles.subtitle}>{subtitle}</div>
        </div>
      </button>
    </div>
  );
};
