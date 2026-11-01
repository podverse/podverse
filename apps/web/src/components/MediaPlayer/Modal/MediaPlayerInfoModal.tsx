'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { ImageNonReact, LoadingSpinner, MarqueeText } from '@podverse/ui';

import {
  MEDIA_PLAYER_MARQUEE_TURN_GROUP,
  MEDIA_PLAYER_MARQUEE_TURN_ORDER,
} from '../../../constants/mediaPlayerMarquee';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';
import { useMediaPlayerVideo } from '../../../contexts/MediaPlayerVideo';
import { useDeviceArtistLinks } from '../../../hooks/useDeviceArtistLinks';
import { useModalArtworkSquareSize } from '../../../hooks/useModalArtworkSquareSize';
import { useRemotePlayerInfo } from '../../../hooks/useRemotePlayerInfo';
import { isNonLiveVideoPlaying } from '../../../utils/mediaPlayer/isNonLiveVideoPlaying';
import {
  buildMediaPlayerArtworkImageCandidates,
  getMediaPlayerArtworkSources,
  shouldUseChapterArtwork,
} from '../../../utils/mediaPlayer/mediaPlayerArtwork';
import { getMediaPlayerInfoResolution } from '../../../utils/mediaPlayer/mediaPlayerInfoResolution';
import { Link } from '../../Link/Link';
import { ReadableTimeRange } from '../../Time/ReadableTimeRange';
import { PlayerDeviceCaption } from '../CrossDevice/PlayerDeviceCaption';
import { ChapterLinkButton } from './ChapterLinkButton';
import { MediaPlayerArtistChooser } from './MediaPlayerArtistChooser';
import { MediaPlayerVtsOverrideLikeButton } from './MediaPlayerVtsOverrideLikeButton';

import styles from '../../../styles/components/MediaPlayer/Modal/MediaPlayerInfoModal.module.scss';

function ClickableTitle({
  title,
  href,
  className,
  testId,
  turnOrder,
  setPlayerModalIsOpen,
}: {
  title?: string | null;
  href?: string;
  className?: string;
  testId: string;
  turnOrder: number;
  setPlayerModalIsOpen: (isOpen: boolean) => void;
}) {
  const tMisc = useTranslations('misc');

  const closePlayerModal = () => {
    setPlayerModalIsOpen(false);
  };

  const label = (
    <MarqueeText
      align="center"
      data-testid={testId}
      turnGroup={MEDIA_PLAYER_MARQUEE_TURN_GROUP.fullPlayer}
      turnOrder={turnOrder}
    >
      {title || tMisc('untitled')}
    </MarqueeText>
  );

  return (
    <div className={className || ''}>
      {href ? (
        <Link href={href} onClick={closePlayerModal}>
          {label}
        </Link>
      ) : (
        <Link onClick={closePlayerModal}>{label}</Link>
      )}
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
    mpItemLabeledItemEnclosures,
    mpEnclosureSelectedParams,
    setPlayerModalIsOpen,
  } = useMediaPlayer();
  const deviceArtistLinks = useDeviceArtistLinks();
  const remoteInfo = useRemotePlayerInfo();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const { videoLocation, setModalVideoTarget, modalVideoAspectRatio } = useMediaPlayerVideo();
  const tMediaPlayer = useTranslations('media_player');
  const router = useRouter();

  const isVideoPlaying = isNonLiveVideoPlaying({
    mpItem,
    mpAddByRSS,
    mpItemLabeledItemEnclosures,
    mpEnclosureSelectedParams,
  });

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
  const remoteImageUrl = remoteInfo?.display.resource.image_url ?? null;
  const displayArtwork =
    remoteInfo === null ? artImageCandidates : remoteImageUrl !== null ? [remoteImageUrl] : [];

  const localResolution = getMediaPlayerInfoResolution({
    mpChannel,
    mpItem,
    mpAddByRSS,
    mpClip,
    mpItemSoundbite,
    mpItemChapter,
    mpItemChapters,
    currentTimeSeconds: mpCurrentTime,
    deviceArtistLinks,
  });
  const infoResolution = remoteInfo?.resolution ?? localResolution;
  const artistLine = infoResolution.artistLine;
  const [chooserOpen, setChooserOpen] = useState(false);
  const chooserTriggerRef = useRef<HTMLButtonElement>(null);

  const showModalVideo = remoteInfo === null && videoLocation === 'full-modal' && isVideoPlaying;
  const ratioKnown = modalVideoAspectRatio !== null;

  const infoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const artSquareSide = useModalArtworkSquareSize({
    infoRef,
    titleRef,
    subtitleRef,
    active: !showModalVideo,
  });

  useEffect(() => {
    if (artistLine.kind !== 'chooser') {
      setChooserOpen(false);
    }
  }, [artistLine.kind]);

  const closeChooser = () => {
    setChooserOpen(false);
    chooserTriggerRef.current?.focus();
  };

  const openArtist = (href: string) => {
    setChooserOpen(false);
    setPlayerModalIsOpen(false);
    router.push(href);
  };

  const artistRow = ((): React.ReactNode => {
    switch (artistLine.kind) {
      case 'hidden':
        return null;
      case 'link':
        return (
          <ClickableTitle
            title={artistLine.link.title}
            href={artistLine.link.href}
            className={styles.artistTitle}
            testId="media-player-modal-artist-title"
            turnOrder={MEDIA_PLAYER_MARQUEE_TURN_ORDER.fullPlayer.artist}
            setPlayerModalIsOpen={setPlayerModalIsOpen}
          />
        );
      case 'chooser':
        return (
          <div className={styles.artistTitle}>
            <button
              ref={chooserTriggerRef}
              aria-expanded={chooserOpen}
              aria-haspopup="dialog"
              type="button"
              onClick={() => setChooserOpen(true)}
            >
              {artistLine.label}
            </button>
            {chooserOpen ? (
              <MediaPlayerArtistChooser
                links={artistLine.links}
                onClose={closeChooser}
                onOpenArtist={openArtist}
              />
            ) : null}
          </div>
        );
    }
  })();

  const titleSection = (
    <div className={styles.titleSection} ref={titleRef}>
      <ClickableTitle
        title={infoResolution.itemTitle ?? undefined}
        href={infoResolution.itemLinkUrl || undefined}
        className={styles.itemTitle}
        testId="media-player-modal-title"
        turnOrder={MEDIA_PLAYER_MARQUEE_TURN_ORDER.fullPlayer.title}
        setPlayerModalIsOpen={setPlayerModalIsOpen}
      />
      {artistRow}
      {infoResolution.channelLinkUrl ? (
        <ClickableTitle
          title={infoResolution.channelTitle ?? undefined}
          href={infoResolution.channelLinkUrl}
          className={styles.channelTitle}
          testId="media-player-modal-channel-title"
          turnOrder={MEDIA_PLAYER_MARQUEE_TURN_ORDER.fullPlayer.channel}
          setPlayerModalIsOpen={setPlayerModalIsOpen}
        />
      ) : infoResolution.channelTitle ? (
        <div className={styles.channelTitle}>
          <MarqueeText
            align="center"
            data-testid="media-player-modal-channel-title"
            turnGroup={MEDIA_PLAYER_MARQUEE_TURN_GROUP.fullPlayer}
            turnOrder={MEDIA_PLAYER_MARQUEE_TURN_ORDER.fullPlayer.channel}
          >
            {infoResolution.channelTitle}
          </MarqueeText>
        </div>
      ) : null}
      {infoResolution.resolvedLikeTarget && (
        <div className={styles.vtsLike}>
          <MediaPlayerVtsOverrideLikeButton likeTarget={infoResolution.resolvedLikeTarget} />
        </div>
      )}
      <PlayerDeviceCaption />
    </div>
  );

  const subtitleSection = (
    <div className={styles.subtitleSection} ref={subtitleRef}>
      {infoResolution.subsectionTitle && infoResolution.subsectionUrl && (
        <>
          <div className={styles.subtitleCopy}>
            <ClickableTitle
              title={infoResolution.subsectionTitle}
              href={infoResolution.subsectionUrl}
              className={styles.subtitle}
              testId="media-player-modal-subsection-title"
              turnOrder={MEDIA_PLAYER_MARQUEE_TURN_ORDER.fullPlayer.subsection}
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
          </div>
          {infoResolution.chapterWebUrl !== null ? (
            <ChapterLinkButton className={styles.chapterLink} href={infoResolution.chapterWebUrl} />
          ) : null}
        </>
      )}
    </div>
  );

  return (
    <div className={styles.info} ref={infoRef}>
      {!showModalVideo || ratioKnown ? titleSection : null}
      {showModalVideo ? (
        <div className={styles.videoStage}>
          {!ratioKnown ? <LoadingSpinner className={styles.videoStageSpinner} /> : null}
          <div
            ref={setModalVideoTarget}
            className={styles.videoWrapper}
            data-testid="modal-video-target"
            style={
              ratioKnown
                ? { aspectRatio: modalVideoAspectRatio, display: 'flex' }
                : { display: 'none' }
            }
          />
        </div>
      ) : (
        <div className={styles.imageWrapper}>
          <div
            className={styles.imageInner}
            style={
              artSquareSide !== null ? { width: artSquareSide, height: artSquareSide } : undefined
            }
          >
            <ImageNonReact
              className={styles.image}
              candidates={displayArtwork}
              alt={tMediaPlayer('media_player_image')}
            />
          </div>
        </div>
      )}
      {!showModalVideo || ratioKnown ? subtitleSection : null}
    </div>
  );
};
