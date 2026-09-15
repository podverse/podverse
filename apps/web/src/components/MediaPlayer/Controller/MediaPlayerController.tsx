'use client';

import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useRef } from 'react';

import { Button, Modal } from '@podverse/ui';

import { useEmbedPlaybackGuardrails } from '../../../contexts/EmbedPlaybackMode';
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
  const tMediaPlayer = useTranslations('media_player');
  const tMisc = useTranslations('misc');
  const { skipMainAppLayoutMutations } = useEmbedPlaybackGuardrails();
  const { mpAddByRSS, mpChannel, mpDuration, mpIsPlaying, mpItem, setMPIsPlaying } =
    useMediaPlayer();
  const { seek: bridgeSeek } = useMediaPlayerControls();
  const { mpCurrentTime, setMPCurrentTime } = useMediaPlayerCurrentTime();

  const { handoffPrompt, continueLocalPlayback, switchToServerPlayback } =
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

  const mpItemRef = useRef(mpItem);
  useEffect(() => {
    mpItemRef.current = mpItem;
  }, [mpItem]);

  const mpIsPlayingRef = useRef(mpIsPlaying);
  useEffect(() => {
    mpIsPlayingRef.current = mpIsPlaying;
  }, [mpIsPlaying]);

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
          isLiveItem: !!mpItemRef.current?.live_item,
        },
        seekWithUiSync,
        () => {
          setMPIsPlaying(!mpIsPlayingRef.current);
        }
      );
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [seekWithUiSync, setMPIsPlaying]);

  useEffect(() => {
    updateLayoutForMediaPlayer(!!mpChannel || !!mpAddByRSS, { skipMainAppLayoutMutations });
  }, [mpAddByRSS, mpChannel, skipMainAppLayoutMutations]);

  return (
    <>
      <NonLiveMediaMount />
      <MediaPlayerControllerLiveStreamAudio />
      <MediaPlayerLiveStreamVideoWrapper />
      <Modal
        ariaLabel={tMediaPlayer('handoff.title')}
        closeButtonAriaLabel={tMisc('close_modal')}
        header={tMediaPlayer('handoff.title')}
        isOpen={handoffPrompt !== null}
        onClose={continueLocalPlayback}
      >
        <Modal.Body>
          <p>
            {tMediaPlayer('handoff.body', {
              localTitle: handoffPrompt?.localTitle ?? tMediaPlayer('handoff.unknown_episode'),
              serverTitle: handoffPrompt?.serverTitle ?? tMediaPlayer('handoff.unknown_episode'),
            })}
          </p>
        </Modal.Body>
        <Modal.Actions>
          <Button onClick={continueLocalPlayback} type="button" variant="secondary">
            {tMediaPlayer('handoff.continue_action')}
          </Button>
          <Button onClick={switchToServerPlayback} type="button" variant="primary">
            {tMediaPlayer('handoff.switch_action')}
          </Button>
        </Modal.Actions>
      </Modal>
    </>
  );
};
