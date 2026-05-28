'use client';

import { useEffect, useRef } from 'react';

import { MediumEnum } from '@podverse/helpers';

import { useAccount } from '../../contexts/Account';
import { useAutoQueue } from '../../contexts/AutoQueue';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useMediaPlayerResourceUpdate } from '../../hooks/useMediaPlayerResourceUpdate';
import { playbackTargetFromStandardLoad } from '../../lib/playback';
import {
  clearAnonymousPlaybackSnapshot,
  readAnonymousPlaybackSnapshot,
} from '../../utils/anonymousPlaybackStorage';

let anonymousPlaybackRestoreStarted = false;

export function AnonymousPlaybackRestoreController() {
  const { loggedInAccount } = useAccount();
  const { autoQueueConfig } = useAutoQueue();
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();

  const loggedInAccountRef = useRef(loggedInAccount);
  const autoQueueConfigRef = useRef(autoQueueConfig);
  const mediaPlayerResourceUpdateRef = useRef(mediaPlayerResourceUpdate);

  useEffect(() => {
    loggedInAccountRef.current = loggedInAccount;
  }, [loggedInAccount]);

  useEffect(() => {
    autoQueueConfigRef.current = autoQueueConfig;
  }, [autoQueueConfig]);

  useEffect(() => {
    mediaPlayerResourceUpdateRef.current = mediaPlayerResourceUpdate;
  }, [mediaPlayerResourceUpdate]);

  useEffect(() => {
    if (loggedInAccount) {
      clearAnonymousPlaybackSnapshot();
    }
  }, [loggedInAccount]);

  useEffect(() => {
    if (loggedInAccount || anonymousPlaybackRestoreStarted) {
      return;
    }
    anonymousPlaybackRestoreStarted = true;

    void (async () => {
      const snapshot = readAnonymousPlaybackSnapshot();
      if (snapshot === null) {
        return;
      }

      if (loggedInAccountRef.current) {
        return;
      }

      const api = getApiRequestService();

      const newAutoQueueConfig = {
        playlist_id_text: autoQueueConfigRef.current.playlist_id_text,
        disabled: false,
        random: autoQueueConfigRef.current.random,
        repeat: autoQueueConfigRef.current.repeat,
        nextPage: autoQueueConfigRef.current.nextPage || 1,
        shuffleHash: autoQueueConfigRef.current.shuffleHash,
      };

      try {
        if (snapshot.kind === 'clip') {
          const fullClip = await api.reqClipGet(snapshot.id_text);
          if (!fullClip || loggedInAccountRef.current) {
            return;
          }
          const fullItem = await api.reqItemGetByIdOrIdText(fullClip.item.id_text);
          if (!fullItem || loggedInAccountRef.current) {
            return;
          }
          const fullChannel = await api.reqChannelGetByIdOrIdText(fullItem.channel_id);
          if (!fullChannel || loggedInAccountRef.current) {
            return;
          }
          mediaPlayerResourceUpdateRef.current({
            target: playbackTargetFromStandardLoad({
              channel: fullChannel,
              clip: fullClip,
              item: fullItem,
              itemChapter: null,
              itemSoundbite: null,
              musicIntent: 'explicit_play',
            }),
            explicitPlaybackSeconds: snapshot.playback_position_seconds,
            mediaFileDurationHintSeconds: snapshot.media_file_duration_seconds,
            itemChapterShouldSeek: false,
            enclosureSelectedParams: 'use-active-item-or-default',
            skipMoveNowPlayingToHistory: false,
            newAutoQueueConfig,
            autoQueueShouldClear: true,
          });
          return;
        }

        if (snapshot.kind === 'item_soundbite') {
          const fullItemSoundbite = await api.reqItemSoundbiteGet(snapshot.id_text);
          if (!fullItemSoundbite?.item || loggedInAccountRef.current) {
            return;
          }
          const fullItem = await api.reqItemGetByIdOrIdText(fullItemSoundbite.item.id_text);
          if (!fullItem || loggedInAccountRef.current) {
            return;
          }
          const fullChannel = await api.reqChannelGetByIdOrIdText(fullItem.channel_id);
          if (!fullChannel || loggedInAccountRef.current) {
            return;
          }
          mediaPlayerResourceUpdateRef.current({
            target: playbackTargetFromStandardLoad({
              channel: fullChannel,
              clip: null,
              item: fullItem,
              itemChapter: null,
              itemSoundbite: fullItemSoundbite,
              musicIntent: 'explicit_play',
            }),
            explicitPlaybackSeconds: snapshot.playback_position_seconds,
            mediaFileDurationHintSeconds: snapshot.media_file_duration_seconds,
            itemChapterShouldSeek: false,
            enclosureSelectedParams: 'use-active-item-or-default',
            skipMoveNowPlayingToHistory: false,
            newAutoQueueConfig,
            autoQueueShouldClear: true,
          });
          return;
        }

        const fullItem = await api.reqItemGetByIdOrIdText(snapshot.id_text);
        if (!fullItem || loggedInAccountRef.current) {
          return;
        }
        const fullChannel = await api.reqChannelGetByIdOrIdText(fullItem.channel_id);
        if (!fullChannel || loggedInAccountRef.current) {
          return;
        }
        const target =
          fullChannel.medium_id === MediumEnum.Music
            ? {
                kind: 'item-music' as const,
                item: fullItem,
                channel: fullChannel,
                intent: 'session_restore' as const,
              }
            : fullChannel.medium_id === MediumEnum.Video
              ? { kind: 'item-video' as const, item: fullItem, channel: fullChannel }
              : { kind: 'item-podcast' as const, item: fullItem, channel: fullChannel };
        mediaPlayerResourceUpdateRef.current({
          target,
          explicitPlaybackSeconds: snapshot.playback_position_seconds,
          mediaFileDurationHintSeconds: snapshot.media_file_duration_seconds,
          itemChapterShouldSeek: false,
          enclosureSelectedParams: 'use-active-item-or-default',
          skipMoveNowPlayingToHistory: false,
          newAutoQueueConfig,
          autoQueueShouldClear: true,
        });
      } catch {
        // Best-effort restore
      }
    })();
  }, [loggedInAccount]);

  return null;
}
