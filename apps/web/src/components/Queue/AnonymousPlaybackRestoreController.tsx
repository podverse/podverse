'use client';

import { useEffect, useRef } from 'react';

import { useAccount } from '../../contexts/Account';
import { useAutoQueue } from '../../contexts/AutoQueue';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useMediaPlayerResourceUpdate } from '../../hooks/useMediaPlayerResourceUpdate';
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
            channel: fullChannel,
            clip: fullClip,
            item: fullItem,
            itemChapter: null,
            itemChapterShouldSeek: false,
            itemSoundbite: null,
            enclosureSelectedParams: 'use-active-item-or-default',
            skipMoveNowPlayingToHistory: false,
            mpDuration: snapshot.media_file_duration_seconds,
            mpCurrentTime: snapshot.playback_position_seconds,
            newAutoQueueConfig,
            autoQueueShouldClear: true,
            musicItemPlaybackIntent: 'session_restore',
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
            channel: fullChannel,
            clip: null,
            item: fullItem,
            itemChapter: null,
            itemChapterShouldSeek: false,
            itemSoundbite: fullItemSoundbite,
            enclosureSelectedParams: 'use-active-item-or-default',
            skipMoveNowPlayingToHistory: false,
            mpDuration: snapshot.media_file_duration_seconds,
            mpCurrentTime: snapshot.playback_position_seconds,
            newAutoQueueConfig,
            autoQueueShouldClear: true,
            musicItemPlaybackIntent: 'session_restore',
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
        mediaPlayerResourceUpdateRef.current({
          channel: fullChannel,
          clip: null,
          item: fullItem,
          itemChapter: null,
          itemChapterShouldSeek: false,
          itemSoundbite: null,
          enclosureSelectedParams: 'use-active-item-or-default',
          skipMoveNowPlayingToHistory: false,
          mpDuration: snapshot.media_file_duration_seconds,
          mpCurrentTime: snapshot.playback_position_seconds,
          newAutoQueueConfig,
          autoQueueShouldClear: true,
          musicItemPlaybackIntent: 'session_restore',
        });
      } catch {
        // Best-effort restore
      }
    })();
  }, [loggedInAccount]);

  return null;
}
