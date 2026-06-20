'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';
import { useMediaPlayerVideo } from '../../../contexts/MediaPlayerVideo';
import { useAddByRSSPositionSave } from '../../../hooks/useAddByRSSPositionSave';
import { useMediaPlayerClearNowPlaying } from '../../../hooks/useMediaPlayerClearNowPlaying';
import { useNonLivePlaybackAvProps } from '../../../hooks/useNonLivePlaybackAvProps';
import { useQueueResourcesMoveNowPlayingToHistory } from '../../../hooks/useQueueResourceMoveNowPlayingToHistory';
import { isNonLiveVideoPlaying } from '../../../utils/mediaPlayer/isNonLiveVideoPlaying';
import { resolveVideoTeleportTarget } from '../../../utils/mediaPlayer/resolveVideoTeleportTarget';
import { NonLiveMediaOrchestrator } from '../Controller/NonLiveMediaOrchestrator';
import { MediaPlayerVideoPortalFloating } from '../Controller/Video/MediaPlayerVideoPortalFloating';

/**
 * Single mount point for non-live audio (hidden) and non-live video (floating portal or modal).
 * Replaces `MediaPlayerControllerAudio`, `MediaPlayerVideoWrapper`, and `MediaPlayerControllerVideo`.
 */
export function NonLiveMediaMount() {
  const avProps = useNonLivePlaybackAvProps();
  const {
    videoLocation,
    setVideoLocation,
    modalVideoTarget,
    floatingVideoTarget,
    setModalVideoAspectRatio,
  } = useMediaPlayerVideo();
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

  // The single, persistent video host. The orchestrator (and its `<video>`) is mounted once into
  // this host; we only ever move the host node between the floating slot, the modal slot, and an
  // offscreen holder via `appendChild`. Re-parenting a media element does not reset playback, so
  // opening/closing the modal stays perfectly in sync (no remount, no `load()`, no re-seek).
  const hostRef = useRef<HTMLDivElement | null>(null);
  const holderRef = useRef<HTMLDivElement | null>(null);
  const [hostReady, setHostReady] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const host = document.createElement('div');
    host.setAttribute('data-persistent-video-host', 'true');
    // `display: contents` keeps the host layout-transparent so the floating/modal stylesheets
    // (and the per-location inline style below) target the `<video>` exactly as a direct child.
    host.style.display = 'contents';
    const holder = document.createElement('div');
    holder.setAttribute('data-persistent-video-holder', 'true');
    holder.style.display = 'none';
    holder.appendChild(host);
    document.body.appendChild(holder);
    hostRef.current = host;
    holderRef.current = holder;
    setHostReady(true);
    return () => {
      holder.remove();
      hostRef.current = null;
      holderRef.current = null;
      setHostReady(false);
    };
  }, []);

  // Teleport the persistent host into whichever slot is active for the current location. Runs after
  // the floating chrome / modal target mount, so the host always lands in a connected node.
  useEffect(() => {
    const host = hostRef.current;
    const holder = holderRef.current;
    if (host === null || holder === null) {
      return;
    }
    const target = resolveVideoTeleportTarget(
      videoLocation,
      floatingVideoTarget,
      modalVideoTarget,
      holder
    );
    if (host.parentElement !== target) {
      target.appendChild(host);
    }
  }, [hostReady, videoLocation, floatingVideoTarget, modalVideoTarget, isVideoPlaying]);

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

  const videoPortal =
    hostReady && hostRef.current !== null && isVideoPlaying && currentVideoKey
      ? ReactDOM.createPortal(videoEngine, hostRef.current)
      : null;

  const floatingChrome =
    isVideoPlaying && currentVideoKey && videoLocation === 'floating' ? (
      <MediaPlayerVideoPortalFloating onClose={handleCloseFloating} />
    ) : null;

  return (
    <>
      <NonLiveMediaOrchestrator {...avProps} mediaType="audio" preload="auto" hidden={true} />
      {videoPortal}
      {floatingChrome}
    </>
  );
}
