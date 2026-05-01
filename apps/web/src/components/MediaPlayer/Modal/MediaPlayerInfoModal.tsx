'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';
import {
  buildMediaPlayerArtworkImageCandidates,
  getMediaPlayerArtworkSources,
  shouldUseChapterArtwork,
} from '../../../utils/mediaPlayer/mediaPlayerArtwork';
import { getMediaPlayerInfoResolution } from '../../../utils/mediaPlayer/mediaPlayerInfoResolution';
import { ImageNonReact } from '../../Image/ImageNonReact';
import { Link } from '../../Link/Link';
import { ReadableTimeRange } from '../../Time/ReadableTimeRange';
import { MediaPlayerVtsOverrideLikeButton } from './MediaPlayerVtsOverrideLikeButton';

import styles from '../../../styles/components/MediaPlayer/Modal/MediaPlayerInfoModal.module.scss';

function ClickableTitle({
  title,
  onClick,
  className,
  children,
  setPlayerModalIsOpen,
}: {
  title?: string | null;
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
  setPlayerModalIsOpen: (isOpen: boolean) => void;
}) {
  const tMisc = useTranslations('misc');

  const handleOnClick = () => {
    setPlayerModalIsOpen(false);
    onClick();
  };

  return (
    <div className={className || ''}>
      <Link onClick={handleOnClick}>{children || title || tMisc('untitled')}</Link>
    </div>
  );
}

export const MediaPlayerInfoModal: React.FC = () => {
  const {
    mpChannel,
    mpItem,
    mpAddByRSS,
    mpClip,
    mpItemChapter,
    mpItemChapters,
    mpItemSoundbite,
    setPlayerModalIsOpen,
  } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const tMediaPlayer = useTranslations('media_player');
  const router = useRouter();

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
    imageSizeTarget: 'largest',
  });

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

  return (
    <div className={styles.info}>
      <div className={styles.titleSection}>
        <ClickableTitle
          title={infoResolution.itemTitle ?? undefined}
          className={styles.itemTitle}
          onClick={() => infoResolution.itemLinkUrl && router.push(infoResolution.itemLinkUrl)}
          setPlayerModalIsOpen={setPlayerModalIsOpen}
        />
        {infoResolution.channelLinkUrl ? (
          <ClickableTitle
            title={infoResolution.channelTitle ?? undefined}
            className={styles.channelTitle}
            onClick={() => router.push(infoResolution.channelLinkUrl)}
            setPlayerModalIsOpen={setPlayerModalIsOpen}
          />
        ) : infoResolution.channelTitle ? (
          <div className={styles.channelTitle}>{String(infoResolution.channelTitle)}</div>
        ) : null}
        {infoResolution.resolvedLikeTarget && (
          <div className={styles.vtsLike}>
            <MediaPlayerVtsOverrideLikeButton likeTarget={infoResolution.resolvedLikeTarget} />
          </div>
        )}
      </div>
      <div className={styles.imageWrapper}>
        <div className={styles.imageInner}>
          <ImageNonReact
            className={styles.image}
            candidates={artImageCandidates}
            alt={tMediaPlayer('media_player_image')}
          />
        </div>
      </div>
      <div className={styles.subtitleSection}>
        {infoResolution.subsectionTitle && infoResolution.subsectionUrl && (
          <>
            <ClickableTitle
              title={infoResolution.subsectionTitle}
              className={styles.subtitle}
              onClick={() => router.push(infoResolution.subsectionUrl)}
              setPlayerModalIsOpen={setPlayerModalIsOpen}
            />
            {infoResolution.subsectionStartTime && infoResolution.subsectionEndTime && (
              <div className={styles.timeRange}>
                <ReadableTimeRange
                  startTime={infoResolution.subsectionStartTime}
                  endTime={infoResolution.subsectionEndTime}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
