'use client';

import { useCallback, useEffect, useRef } from 'react';

import { getSelectedLabeledItemEnclosureAndSource, MediumEnum } from '@podverse/helpers';

import { useMediaPlayer } from '../../../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../../../contexts/MediaPlayerCurrentTime';
import { useMediaPlayerVideo } from '../../../../contexts/MediaPlayerVideo';
import { useAddByRSSPositionSave } from '../../../../hooks/useAddByRSSPositionSave';
import { useMediaPlayerClearNowPlaying } from '../../../../hooks/useMediaPlayerClearNowPlaying';
import { useQueueResourcesMoveNowPlayingToHistory } from '../../../../hooks/useQueueResourceMoveNowPlayingToHistory';
import { MediaPlayerControllerVideo } from './MediaPlayerControllerVideo';
import { MediaPlayerVideoPortalFloating } from './MediaPlayerVideoPortalFloating';

export function MediaPlayerVideoWrapper() {
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
    const isNewSelection = lastVideoKeyRef.current !== currentVideoKey;
    if (isNewSelection) {
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

  if (mpAddByRSS && isAddByRSSVideo) {
    if (videoLocation === 'floating') {
      return (
        <MediaPlayerVideoPortalFloating onClose={handleCloseFloating}>
          <MediaPlayerControllerVideo />
        </MediaPlayerVideoPortalFloating>
      );
    }
    return null;
  }

  if (!mpItem || mpItem.live_item) {
    return null;
  }

  if (isVideoFile && !isLiveItem) {
    if (videoLocation === 'floating') {
      return (
        <MediaPlayerVideoPortalFloating onClose={handleCloseFloating}>
          <MediaPlayerControllerVideo />
        </MediaPlayerVideoPortalFloating>
      );
    }
  }

  return null;
}
