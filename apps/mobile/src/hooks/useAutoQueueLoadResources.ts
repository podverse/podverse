import { useCallback, useEffect, useRef } from 'react';

import type {
  DTOChannel,
  DTOClip,
  DTOItemQueueItem,
  DTOItemSoundbite,
  DTOPlaylistResource,
} from '@podverse/helpers/dto';
import { MediumEnum } from '@podverse/helpers/medium';

import { useAuth } from '../auth/AuthProvider';
import { useAutoQueue } from '../contexts/AutoQueueProvider';
import type { MobileAuthRequestContext } from '../data';
import { autoQueueRepository } from '../data';
import type { AutoQueueResourcesMap } from '../lib/autoQueue/autoQueue';

/**
 * The active resource that seeds the auto-queue fill. On web this is read from the
 * MediaPlayer context; the orchestrator passes the seed in explicitly.
 */
export type AutoQueueSeed = {
  item: DTOItemQueueItem;
  channel: DTOChannel;
  clip: DTOClip | null;
  item_soundbite: DTOItemSoundbite | null;
};

/**
 * RN port of web `useAutoQueueLoadResources`. Loads the next auto-queue rows from either a playlist
 * source (sequential / random) or a channel source (pub-date / season / shuffle), advancing paging
 * and de-duplicating in random mode. Fetches are repository-mediated; the returned callback is
 * stable (refs hold config/resources/auth) for orchestrator/player consumers.
 *
 * Returns the resources map that was just written so callers (e.g. `advanceAutoQueue`) can read the
 * next row synchronously — React `setState` alone would leave consumer refs stale until the next
 * effect flush, which incorrectly cleared now-playing after skip/ended.
 */
export function useAutoQueueLoadResources() {
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const { autoQueueResources, setAutoQueueResources, autoQueueConfig, setAutoQueueConfig } =
    useAutoQueue();

  const authRef = useRef<MobileAuthRequestContext>({
    accessToken,
    clearSession,
    refreshToken,
    setTokens,
  });
  useEffect(() => {
    authRef.current = { accessToken, clearSession, refreshToken, setTokens };
  }, [accessToken, clearSession, refreshToken, setTokens]);

  const autoQueueResourcesRef = useRef(autoQueueResources);
  useEffect(() => {
    autoQueueResourcesRef.current = autoQueueResources;
  }, [autoQueueResources]);

  const autoQueueConfigRef = useRef(autoQueueConfig);
  useEffect(() => {
    autoQueueConfigRef.current = autoQueueConfig;
  }, [autoQueueConfig]);

  return useCallback(
    async (seed: AutoQueueSeed | null): Promise<AutoQueueResourcesMap> => {
      if (seed === null) {
        const empty: AutoQueueResourcesMap = {};
        autoQueueResourcesRef.current = empty;
        setAutoQueueResources(empty);
        return empty;
      }

      const context = authRef.current;
      const config = autoQueueConfigRef.current;

      let newAutoQueueResources: AutoQueueResourcesMap = {};
      if (!autoQueueResourcesRef.current[0]) {
        newAutoQueueResources[0] = {
          channel: seed.channel,
          clip: seed.clip,
          item: seed.item,
          item_soundbite: seed.item_soundbite,
        };
      } else {
        newAutoQueueResources = { ...autoQueueResourcesRef.current };
      }

      let playlistResourcesResponse: DTOPlaylistResource[] = [];
      let itemsResponse: DTOItemQueueItem[] = [];

      if (config.playlist_id_text !== null) {
        if (config.random) {
          playlistResourcesResponse = await autoQueueRepository.getPlaylistResourcesByShuffle(
            context,
            config.playlist_id_text,
            config.shuffleHash,
            config.nextPage
          );
          if (config.repeat && playlistResourcesResponse.length === 0) {
            playlistResourcesResponse = await autoQueueRepository.getPlaylistResourcesByShuffle(
              context,
              config.playlist_id_text,
              config.shuffleHash,
              1
            );
            setAutoQueueConfig({ ...config, nextPage: 2 });
          } else {
            setAutoQueueConfig({ ...config, nextPage: config.nextPage + 1 });
          }
        } else {
          playlistResourcesResponse =
            await autoQueueRepository.getPlaylistResourcesForQueueByListPosition(
              context,
              config.playlist_id_text,
              {
                clip_id_text: seed.clip?.id_text,
                item_id_text: seed.item.id_text,
                item_soundbite_id_text: seed.item_soundbite?.id_text,
              }
            );
          if (config.repeat && playlistResourcesResponse.length === 0) {
            playlistResourcesResponse =
              await autoQueueRepository.getPlaylistResourcesByPlaylistIdTextPage1(
                context,
                config.playlist_id_text
              );
          }
        }
      } else {
        if (config.random) {
          itemsResponse = await autoQueueRepository.getChannelItemsByShuffle(
            context,
            seed.channel.id_text,
            config.nextPage,
            config.shuffleHash
          );
          if (config.repeat && itemsResponse.length === 0) {
            itemsResponse = await autoQueueRepository.getChannelItemsByShuffle(
              context,
              seed.channel.id_text,
              1,
              config.shuffleHash
            );
            setAutoQueueConfig({ ...config, nextPage: 2 });
          } else {
            setAutoQueueConfig({ ...config, nextPage: config.nextPage + 1 });
          }
        } else if (seed.channel.medium_id === MediumEnum.Music) {
          itemsResponse = await autoQueueRepository.getItemsForQueueBySeason(
            context,
            seed.item.id_text
          );
          if (config.repeat && itemsResponse.length === 0) {
            itemsResponse = await autoQueueRepository.getChannelItemsBySeasonPage1(
              context,
              seed.channel.id_text
            );
          }
        } else {
          itemsResponse = await autoQueueRepository.getItemsForQueueByPubDate(
            context,
            seed.item.id_text
          );
          if (config.repeat && itemsResponse.length === 0) {
            itemsResponse = await autoQueueRepository.getChannelItemsRecentPage1(
              context,
              seed.channel.id_text
            );
          }
        }
      }

      const existingKeys = Object.keys(newAutoQueueResources).map(Number);
      const startKey = existingKeys.length > 0 ? Math.max(...existingKeys) + 1 : 0;

      if (config.playlist_id_text !== null) {
        let validIdx = 0;
        playlistResourcesResponse.forEach((playlistResource) => {
          if (playlistResource.clip && playlistResource.clip.item) {
            newAutoQueueResources[startKey + validIdx] = {
              channel: playlistResource.clip.item.channel ?? null,
              clip: playlistResource.clip,
              item: playlistResource.clip.item,
              item_soundbite: null,
            };
            validIdx++;
          } else if (playlistResource.item_soundbite && playlistResource.item_soundbite.item) {
            newAutoQueueResources[startKey + validIdx] = {
              channel: playlistResource.item_soundbite.item.channel ?? null,
              clip: null,
              item: playlistResource.item_soundbite.item,
              item_soundbite: playlistResource.item_soundbite,
            };
            validIdx++;
          } else if (playlistResource.item) {
            newAutoQueueResources[startKey + validIdx] = {
              channel: playlistResource.item.channel ?? null,
              clip: null,
              item: playlistResource.item,
              item_soundbite: null,
            };
            validIdx++;
          }
        });
      } else {
        itemsResponse.forEach((item, idx) => {
          newAutoQueueResources[startKey + idx] = {
            channel: item.channel ?? null,
            clip: null,
            item,
            item_soundbite: null,
          };
        });
      }

      // Random mode: drop duplicate id_text rows, keeping the first occurrence.
      if (config.random) {
        const seenClipIds = new Set<string>();
        const seenSoundbiteIds = new Set<string>();
        const seenItemIds = new Set<string>();
        const dedupedResources: AutoQueueResourcesMap = {};
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

      autoQueueResourcesRef.current = newAutoQueueResources;
      setAutoQueueResources(newAutoQueueResources);
      return newAutoQueueResources;
    },
    [setAutoQueueConfig, setAutoQueueResources]
  );
}
