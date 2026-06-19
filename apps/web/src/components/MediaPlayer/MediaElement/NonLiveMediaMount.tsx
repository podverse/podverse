'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';
import { useMediaPlayerVideo } from '../../../contexts/MediaPlayerVideo';
import { useAddByRSSPositionSave } from '../../../hooks/useAddByRSSPositionSave';
import { useMediaPlayerClearNowPlaying } from '../../../hooks/useMediaPlayerClearNowPlaying';
import { useNonLivePlaybackAvProps } from '../../../hooks/useNonLivePlaybackAvProps';
import { useQueueResourcesMoveNowPlayingToHistory } from '../../../hooks/useQueueResourceMoveNowPlayingToHistory';
import { isNonLiveVideoPlaying } from '../../../utils/mediaPlayer/isNonLiveVideoPlaying';
import { NonLiveMediaOrchestrator } from '../Controller/NonLiveMediaOrchestrator';
import { MediaPlayerVideoPortalFloating } from '../Controller/Video/MediaPlayerVideoPortalFloating';

/**
 * Single mount point for non-live audio (hidden) and non-live video (floating portal or modal).
 * Replaces `MediaPlayerControllerAudio`, `MediaPlayerVideoWrapper`, and `MediaPlayerControllerVideo`.
 */
export function NonLiveMediaMount() {
  const avProps = useNonLivePlaybackAvProps();
  const { videoLocation, setVideoLocation, modalVideoTarget, setModalVideoAspectRatio } =
    useMediaPlayerVideo();
  const {
    mpItem,
    mpAddByRSS,
    mpClip,
    mpItemSoundbite,
    mpItemLabeledItemEnclosures,
    mpEnclosureSelectedParams,
    playerModalIsOpen,
  } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const moveNowPlayingToHistory = useQueueResourcesMoveNowPlayingToHistory();
  const { handleClose: handleAddByRSSClose } = useAddByRSSPositionSave();
  const clearNowPlaying = useMediaPlayerClearNowPlaying();

  const isVideoPlaying = isNonLiveVideoPlaying({
    mpItem,
    mpAddByRSS,
    mpItemLabeledItemEnclosures,
    mpEnclosureSelectedParams,
  });

  const currentVideoKey =
    isVideoPlaying && mpAddByRSS?.idText
      ? `addbyrss:${mpAddByRSS.idText}`
      : isVideoPlaying && mpItem?.id_text
        ? `item:${mpItem.id_text}`
        : null;
  const lastVideoKeyRef = useRef<string | null>(null);

  const handleCloseFloating = useCallback(async () => {
    if (mpAddByRSS) {
      await handleAddByRSSClose(mpCurrentTime);
    } else {
      await moveNowPlayingToHistory({
        completed: false,
        mpClip,
        mpItem,
        mpItemSoundbite,
      });
    }
    clearNowPlaying();
    setVideoLocation(null);
  }, [
    mpAddByRSS,
    handleAddByRSSClose,
    mpCurrentTime,
    moveNowPlayingToHistory,
    mpClip,
    mpItem,
    mpItemSoundbite,
    clearNowPlaying,
    setVideoLocation,
  ]);

  useEffect(() => {
    if (!currentVideoKey) {
      lastVideoKeyRef.current = null;
      return;
    }
    if (lastVideoKeyRef.current !== currentVideoKey) {
      lastVideoKeyRef.current = currentVideoKey;
      if (mpAddByRSS && isVideoPlaying) {
        setVideoLocation('floating');
        return;
      }
      if (videoLocation === null) {
        setVideoLocation('floating');
      }
    }
  }, [currentVideoKey, videoLocation, setVideoLocation, mpAddByRSS, isVideoPlaying]);

  useEffect(() => {
    if (!currentVideoKey) {
      return;
    }
    if (playerModalIsOpen) {
      setVideoLocation('full-modal');
      return;
    }
    if (videoLocation === 'full-modal') {
      setVideoLocation('floating');
    }
  }, [playerModalIsOpen, currentVideoKey, videoLocation, setVideoLocation]);

  const videoStyle =
    videoLocation === 'full-modal'
      ? {
          width: '100%',
          height: '100%',
          objectFit: 'contain' as const,
          display: 'block',
        }
      : { width: '100%' };

  const videoEngine = (
    <NonLiveMediaOrchestrator
      {...avProps}
      mediaType="video"
      preload="auto"
      style={videoStyle}
      onVideoAspectRatioChange={setModalVideoAspectRatio}
    />
  );

  let floatingVideo: ReactNode = null;
  if (isVideoPlaying && currentVideoKey) {
    if (videoLocation === 'floating') {
      floatingVideo = (
        <MediaPlayerVideoPortalFloating onClose={handleCloseFloating}>
          {videoEngine}
        </MediaPlayerVideoPortalFloating>
      );
    } else if (videoLocation === 'full-modal' && modalVideoTarget !== null) {
      floatingVideo = ReactDOM.createPortal(videoEngine, modalVideoTarget);
    }
  }

  return (
    <>
      <NonLiveMediaOrchestrator {...avProps} mediaType="audio" preload="auto" hidden={true} />
      {floatingVideo}
    </>
  );
}
