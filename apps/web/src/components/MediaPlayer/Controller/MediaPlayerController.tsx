'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useRef } from 'react';

import { Button, Modal } from '@podverse/ui';

import { useEmbedPlaybackGuardrails } from '../../../contexts/EmbedPlaybackMode';
import { useMediaPlayerControllerQueueHeadLoading } from '../../../hooks/useMediaPlayerControllerQueueHeadLoading';
import { usePlayerTransport } from '../../../hooks/usePlayerTransport';
import { useMediaPlayerBarVisible } from '../../../hooks/useRemotePlayerDisplay';
import { liveMediaStore } from '../../../lib/livePlayback/liveMediaStore';
import { updateLayoutForMediaPlayer } from '../../../utils/mediaPlayer/mediaPlayerLayout';
import { CrossDevicePlaybackNotices } from '../CrossDevice/CrossDevicePlaybackNotices';
import { NonLiveMediaMount } from '../MediaElement/NonLiveMediaMount';
import { MediaPlayerControllerLiveStreamAudio } from './LiveStream/MediaPlayerControllerLiveStreamAudio';
import { MediaPlayerLiveStreamVideoWrapper } from './LiveStream/MediaPlayerLiveStreamVideoWrapper';
import { handleMediaPlayerWindowKeyDown } from './mediaPlayerWindowKeyDown';

export const MediaPlayerController: React.FC = () => {
  const tMediaPlayer = useTranslations('media_player');
  const tMisc = useTranslations('misc');
  const { skipMainAppLayoutMutations } = useEmbedPlaybackGuardrails();
  const isBarVisible = useMediaPlayerBarVisible();
  const transport = usePlayerTransport();
  const transportRef = useRef(transport);
  transportRef.current = transport;

  const { handoffPrompt, continueLocalPlayback, switchToServerPlayback } =
    useMediaPlayerControllerQueueHeadLoading();

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const current = transportRef.current;
      // The window can appear after the listener is attached, so read it at the key press.
      handleMediaPlayerWindowKeyDown(
        event,
        target,
        {
          hasResource: current.hasResource,
          canJump:
            !current.isLive ||
            (!current.isRemote && liveMediaStore.getSnapshot().display.canRewind),
        },
        current.jumpBy,
        current.togglePlayPause
      );
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  useEffect(() => {
    updateLayoutForMediaPlayer(isBarVisible, { skipMainAppLayoutMutations });
  }, [isBarVisible, skipMainAppLayoutMutations]);

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
      <CrossDevicePlaybackNotices />
    </>
  );
};
