'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';

import { getSelectedLabeledItemEnclosureAndSource, MediumEnum } from '@podverse/helpers';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';
import { useMediaPlayerVideo } from '../../../contexts/MediaPlayerVideo';
import { useAddByRSSPositionSave } from '../../../hooks/useAddByRSSPositionSave';
import { useMediaPlayerClearNowPlaying } from '../../../hooks/useMediaPlayerClearNowPlaying';
import { useNonLivePlaybackAvProps } from '../../../hooks/useNonLivePlaybackAvProps';
import { useQueueResourcesMoveNowPlayingToHistory } from '../../../hooks/useQueueResourceMoveNowPlayingToHistory';
import { NonLiveMediaOrchestrator } from '../Controller/NonLiveMediaOrchestrator';
import { MediaPlayerVideoPortalFloating } from '../Controller/Video/MediaPlayerVideoPortalFloating';

/**
 * Single mount point for non-live audio (hidden) and non-live video (floating portal).
 * Replaces `MediaPlayerControllerAudio`, `MediaPlayerVideoWrapper`, and `MediaPlayerControllerVideo`.
 */
export function NonLiveMediaMount() {
  const avProps = useNonLivePlaybackAvProps();
  const { videoLocation, setVideoLocation } = useMediaPlayerVideo();
  const {
    mpItem,
    mpAddByRSS,
    mpClip,
    mpItemSoundbite,
    mpItemLabeledItemEnclosures,
    mpEnclosureSelectedParams,
  } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const moveNowPlayingToHistory = useQueueResourcesMoveNowPlayingToHistory();
  const { handleClose: handleAddByRSSClose } = useAddByRSSPositionSave();
  const clearNowPlaying = useMediaPlayerClearNowPlaying();

  const selectedItemEnclosureAndSource =
    mpItemLabeledItemEnclosures.length > 0
      ? getSelectedLabeledItemEnclosureAndSource({
          labeledItemEnclosures: mpItemLabeledItemEnclosures,
          type: mpEnclosureSelectedParams.type,
          enclosureRowIndex: mpEnclosureSelectedParams.enclosureRowSelected,
          sourceRowIndex: mpEnclosureSelectedParams.sourceRowSelected,
        })
      : null;
  const addByRSSSelectedMediaType =
    mpAddByRSS && mpItemLabeledItemEnclosures.length > 0
      ? (selectedItemEnclosureAndSource?.labeledItemEnclosure?.mediaType ?? null)
      : null;
  const isAddByRSSVideo = mpAddByRSS
    ? addByRSSSelectedMediaType
      ? addByRSSSelectedMediaType === 'video'
      : mpAddByRSS.resourceData?.medium_id === MediumEnum.Video
    : false;
  const isVideoFile = selectedItemEnclosureAndSource?.labeledItemEnclosure?.mediaType === 'video';
  const isLiveItem = !!mpItem?.live_item;
  const currentVideoKey =
    isAddByRSSVideo && mpAddByRSS?.idText
      ? `addbyrss:${mpAddByRSS.idText}`
      : isVideoFile && !isLiveItem && mpItem?.id_text
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
      if (mpAddByRSS && isAddByRSSVideo) {
        setVideoLocation('floating');
        return;
      }
      if (videoLocation === null) {
        setVideoLocation('floating');
      }
    }
  }, [currentVideoKey, videoLocation, setVideoLocation, mpAddByRSS, isAddByRSSVideo]);

  const videoEngine = (
    <NonLiveMediaOrchestrator
      {...avProps}
      mediaType="video"
      preload="auto"
      style={{ width: '100%' }}
    />
  );

  let floatingVideo: ReactNode = null;
  if (mpAddByRSS && isAddByRSSVideo) {
    if (videoLocation === 'floating') {
      floatingVideo = (
        <MediaPlayerVideoPortalFloating onClose={handleCloseFloating}>
          {videoEngine}
        </MediaPlayerVideoPortalFloating>
      );
    }
  } else if (mpItem && !mpItem.live_item && isVideoFile) {
    if (videoLocation === 'floating') {
      floatingVideo = (
        <MediaPlayerVideoPortalFloating onClose={handleCloseFloating}>
          {videoEngine}
        </MediaPlayerVideoPortalFloating>
      );
    }
  }

  return (
    <>
      <NonLiveMediaOrchestrator {...avProps} mediaType="audio" preload="auto" hidden={true} />
      {floatingVideo}
    </>
  );
}
