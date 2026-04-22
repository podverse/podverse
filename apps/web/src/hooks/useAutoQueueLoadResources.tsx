import { useCallback, useEffect, useRef } from 'react';

import type {
  DTOChannel,
  DTOClip,
  DTOItemQueueItem,
  DTOItemSoundbite,
  DTOPlaylistResource,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import type { AutoQueueResourcesMap } from '../contexts/AutoQueue';
import { useAutoQueue } from '../contexts/AutoQueue';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { getApiRequestService } from '../factories/apiRequestService';

export function useAutoQueueLoadResources() {
  const { mpChannel, mpItem, mpClip, mpItemSoundbite } = useMediaPlayer();
  const { autoQueueResources, setAutoQueueResources, autoQueueConfig, setAutoQueueConfig } =
    useAutoQueue();

  const mpItemRef = useRef(mpItem);
  useEffect(() => {
    mpItemRef.current = mpItem;
  }, [mpItem]);

  const mpChannelRef = useRef(mpChannel);
  useEffect(() => {
    mpChannelRef.current = mpChannel;
  }, [mpChannel]);

  const mpClipRef = useRef(mpClip);
  useEffect(() => {
    mpClipRef.current = mpClip;
  }, [mpClip]);

  const mpItemSoundbiteRef = useRef(mpItemSoundbite);
  useEffect(() => {
    mpItemSoundbiteRef.current = mpItemSoundbite;
  }, [mpItemSoundbite]);

  const autoQueueResourcesRef = useRef(autoQueueResources);
  useEffect(() => {
    autoQueueResourcesRef.current = autoQueueResources;
  }, [autoQueueResources]);

  const autoQueueConfigRef = useRef(autoQueueConfig);
  useEffect(() => {
    autoQueueConfigRef.current = autoQueueConfig;
  }, [autoQueueConfig]);

  return useCallback(async () => {
    const apiRequestService = getApiRequestService();

    if (!mpItemRef.current || !mpChannelRef.current) {
      setAutoQueueResources({});
      return;
    }

    let newAutoQueueResources: AutoQueueResourcesMap = {};

    if (!autoQueueResourcesRef.current[0]) {
      newAutoQueueResources[0] = {
        item: mpItemRef.current,
        clip: mpClipRef.current,
        item_soundbite: mpItemSoundbiteRef.current,
        channel: mpChannelRef.current,
      };
    } else {
      newAutoQueueResources = { ...autoQueueResourcesRef.current };
    }

    let playlistResourcesResponse: DTOPlaylistResource[] = [];
    let itemsResponse: DTOItemQueueItem[] = [];

    if (autoQueueConfigRef.current.playlist_id_text) {
      if (autoQueueConfigRef.current.random) {
        const response = await apiRequestService.reqPlaylistResourceGetManyByShuffle(
          autoQueueConfigRef.current.playlist_id_text,
          autoQueueConfigRef.current.shuffleHash,
          autoQueueConfigRef.current.nextPage
        );
        playlistResourcesResponse = response.data;
        if (autoQueueConfigRef.current.repeat && playlistResourcesResponse.length === 0) {
          const response = await apiRequestService.reqPlaylistResourceGetManyByShuffle(
            autoQueueConfigRef.current.playlist_id_text,
            autoQueueConfigRef.current.shuffleHash,
            1
          );
          playlistResourcesResponse = response.data;
          setAutoQueueConfig({
            ...autoQueueConfigRef.current,
            nextPage: 2,
            shuffleHash: autoQueueConfigRef.current.shuffleHash,
          });
        } else {
          setAutoQueueConfig({
            ...autoQueueConfigRef.current,
            nextPage: autoQueueConfigRef.current.nextPage + 1,
          });
        }
      } else {
        const response = await apiRequestService.reqPlaylistResourceGetManyForQueueByListPosition(
          autoQueueConfigRef.current.playlist_id_text,
          {
            clip_id_text: mpClipRef.current?.id_text,
            item_soundbite_id_text: mpItemSoundbiteRef.current?.id_text,
            item_id_text: mpItemRef.current.id_text,
          },
          'forward'
        );
        playlistResourcesResponse = response.data;

        if (autoQueueConfigRef.current.repeat && playlistResourcesResponse.length === 0) {
          const response = await apiRequestService.reqPlaylistResourceGetManyByPlaylistIdText(
            autoQueueConfigRef.current.playlist_id_text,
            { page: 1 }
          );
          playlistResourcesResponse = response.data;
        }
      }
    } else {
      if (autoQueueConfigRef.current.random) {
        const response = await apiRequestService.reqItemGetManyByChannelShuffle(
          mpChannelRef.current.id_text,
          {
            page: autoQueueConfigRef.current.nextPage,
            shuffleHash: autoQueueConfigRef.current.shuffleHash,
          }
        );
        itemsResponse = response.data;
        if (autoQueueConfigRef.current.repeat && itemsResponse.length === 0) {
          const response = await apiRequestService.reqItemGetManyByChannelShuffle(
            mpChannelRef.current.id_text,
            {
              page: 1,
              shuffleHash: autoQueueConfigRef.current.shuffleHash,
            }
          );
          itemsResponse = response.data;
          setAutoQueueConfig({
            ...autoQueueConfigRef.current,
            nextPage: 1 + 1,
            shuffleHash: autoQueueConfigRef.current.shuffleHash,
          });
        } else {
          setAutoQueueConfig({
            ...autoQueueConfigRef.current,
            nextPage: autoQueueConfigRef.current.nextPage + 1,
          });
        }
      } else if (mpChannelRef.current?.medium_id === MediumEnum.Music) {
        itemsResponse = await apiRequestService.reqItemGetManyForQueueBySeason(
          mpItemRef.current.id_text,
          'forward'
        );
        if (autoQueueConfigRef.current.repeat && itemsResponse.length === 0) {
          const response = await apiRequestService.reqItemGetManyByChannelBySeason({
            idOrIdText: mpChannelRef.current.id_text,
            page: 1,
            sort: 'forward',
            range: null,
          });
          itemsResponse = response.data;
        }
      } else {
        itemsResponse = await apiRequestService.reqItemGetManyForQueueByPubDate(
          mpItemRef.current.id_text,
          'forward'
        );
        if (autoQueueConfigRef.current.repeat && itemsResponse.length === 0) {
          const response = await apiRequestService.reqItemGetManyByChannel({
            idOrIdText: mpChannelRef.current.id_text,
            page: 1,
            sort: 'recent',
            range: null,
          });
          itemsResponse = response.data;
        }
      }
    }

    const existingKeys = Object.keys(newAutoQueueResources).map(Number);
    const startKey = existingKeys.length > 0 ? Math.max(...existingKeys) + 1 : 0;

    if (autoQueueConfigRef.current.playlist_id_text) {
      let validIdx = 0;
      playlistResourcesResponse.forEach((playlistResource) => {
        if (playlistResource.clip && playlistResource.clip.item) {
          newAutoQueueResources[startKey + validIdx] = {
            item: playlistResource.clip.item,
            clip: playlistResource.clip,
            item_soundbite: null,
            channel: playlistResource.clip.item.channel ?? null,
          };
          validIdx++;
        } else if (playlistResource.item_soundbite && playlistResource.item_soundbite.item) {
          newAutoQueueResources[startKey + validIdx] = {
            item: playlistResource.item_soundbite.item,
            clip: null,
            item_soundbite: playlistResource.item_soundbite,
            channel: playlistResource.item_soundbite.item.channel ?? null,
          };
          validIdx++;
        } else if (playlistResource.item) {
          newAutoQueueResources[startKey + validIdx] = {
            item: playlistResource.item,
            clip: null,
            item_soundbite: null,
            channel: playlistResource.item.channel ?? null,
          };
          validIdx++;
        }
      });
    } else {
      itemsResponse.forEach((item, idx) => {
        newAutoQueueResources[startKey + idx] = {
          item: item,
          clip: null,
          item_soundbite: null,
          channel: item.channel ?? null,
        };
      });
    }

    // If random is enabled, remove duplicate id_text items, keeping the first occurrence
    if (autoQueueConfigRef.current.random) {
      const seenClipIds = new Set<string>();
      const seenSoundbiteIds = new Set<string>();
      const seenItemIds = new Set<string>();
      const dedupedResources: {
        [key: number]: {
          item: DTOItemQueueItem;
          clip: DTOClip | null;
          item_soundbite: DTOItemSoundbite | null;
          channel: DTOChannel | null;
        };
      } = {};
      let newKey = 0;
      for (const key of Object.keys(newAutoQueueResources)
        .map(Number)
        .sort((a, b) => a - b)) {
        const row = newAutoQueueResources[key];
        if (!row) {
          continue;
        }
        let shouldSkip = false;
        if (row.clip) {
          if (seenClipIds.has(row.clip.id_text)) {
            shouldSkip = true;
          } else {
            seenClipIds.add(row.clip.id_text);
          }
        } else if (row.item_soundbite) {
          if (seenSoundbiteIds.has(row.item_soundbite.id_text)) {
            shouldSkip = true;
          } else {
            seenSoundbiteIds.add(row.item_soundbite.id_text);
          }
        } else {
          if (seenItemIds.has(row.item.id_text)) {
            shouldSkip = true;
          } else {
            seenItemIds.add(row.item.id_text);
          }
        }
        if (!shouldSkip) {
          dedupedResources[newKey] = row;
          newKey++;
        }
      }
      newAutoQueueResources = dedupedResources;
    }

    setAutoQueueResources(newAutoQueueResources);
  }, []);
}
