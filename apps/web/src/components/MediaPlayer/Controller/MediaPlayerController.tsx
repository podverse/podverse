'use client';

import React, { useCallback, useEffect, useRef } from 'react';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerControls } from '../../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';
import { useMediaPlayerControllerQueueHeadLoading } from '../../../hooks/useMediaPlayerControllerQueueHeadLoading';
import { updateLayoutForMediaPlayer } from '../../../utils/mediaPlayer/mediaPlayerLayout';
import { NonLiveMediaMount } from '../MediaElement/NonLiveMediaMount';
import { MediaPlayerControllerLiveStreamAudio } from './LiveStream/MediaPlayerControllerLiveStreamAudio';
import { MediaPlayerLiveStreamVideoWrapper } from './LiveStream/MediaPlayerLiveStreamVideoWrapper';
import { handleMediaPlayerWindowKeyDown } from './mediaPlayerWindowKeyDown';

export const MediaPlayerController: React.FC = () => {
  const { mpAddByRSS, mpChannel, mpDuration } = useMediaPlayer();
  const { seek: bridgeSeek, togglePlay } = useMediaPlayerControls();
  const { mpCurrentTime, setMPCurrentTime } = useMediaPlayerCurrentTime();

  useMediaPlayerControllerQueueHeadLoading();

  const seekWithUiSync = useCallback(
    (time: number) => {
      bridgeSeek(time);
      setMPCurrentTime(time);
    },
    [bridgeSeek, setMPCurrentTime]
  );

  const mpCurrentTimeRef = useRef(mpCurrentTime);
  useEffect(() => {
    mpCurrentTimeRef.current = mpCurrentTime;
  }, [mpCurrentTime]);

  const mpDurationRef = useRef(mpDuration);
  useEffect(() => {
    mpDurationRef.current = mpDuration;
  }, [mpDuration]);

  const mpChannelRef = useRef(mpChannel);
  useEffect(() => {
    mpChannelRef.current = mpChannel;
  }, [mpChannel]);

  const mpAddByRSSRef = useRef(mpAddByRSS);
  useEffect(() => {
    mpAddByRSSRef.current = mpAddByRSS;
  }, [mpAddByRSS]);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      handleMediaPlayerWindowKeyDown(
        e,
        e.target as HTMLElement,
        {
          mpAddByRSS: mpAddByRSSRef.current,
          mpChannel: mpChannelRef.current,
          mpCurrentTime: mpCurrentTimeRef.current,
          mpDuration: mpDurationRef.current,
        },
        seekWithUiSync,
        () => {
          void togglePlay();
        }
      );
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [seekWithUiSync, togglePlay]);

  useEffect(() => {
    updateLayoutForMediaPlayer(!!mpChannel || !!mpAddByRSS);
  }, [mpChannel, mpAddByRSS]);

  return (
    <>
      <NonLiveMediaMount />
      <MediaPlayerControllerLiveStreamAudio />
      <MediaPlayerLiveStreamVideoWrapper />
    </>
  );
};
