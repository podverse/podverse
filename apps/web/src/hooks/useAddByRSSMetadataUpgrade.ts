'use client';

import { useCallback, useEffect, useRef } from 'react';

import type { AddByRSSResourceData } from '@podverse/helpers';
import { buildAddByRSSResourceData } from '@podverse/parser-mapping';

import { useAccount } from '../contexts/Account';
import { useConfig } from '../contexts/Config';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import {
  onAddByRSSFeedChanged,
  toAddByRSSFeedChangedUrl,
} from '../utils/addByRSS/feedChangedEvent';
import { enqueueAddByRSSFirstParses } from '../utils/addByRSS/firstParse';
import {
  findAddByRSSItemInStoredFeed,
  hasStoredAddByRSSFeed,
} from '../utils/addByRSS/playFromQueueResource';
import { syncAddByRSSFollowStubs } from '../utils/addByRSS/sync';
import {
  addByRSSPlaybackIdentity,
  readPlaybackHandoffLocalState,
  writePlaybackHandoffLocalState,
} from './playbackHandoffState';

/** A loaded add-by-RSS item whose metadata came from the row, not this browser's feed parse. */
export type AddByRSSMetadataUpgradeTarget = {
  /** Add by RSS identity of the loaded item. */
  identity: string;
  feedUrl: string;
  resourceData: AddByRSSResourceData;
};

type ArmedUpgrade = {
  target: AddByRSSMetadataUpgradeTarget;
  unsubscribe: () => void;
};

/**
 * Fills in a loaded add-by-RSS item's metadata (title, artwork, notes, chapters, transcripts,
 * value tags) once this browser has parsed its feed. Only the display state changes; the media
 * element keeps its source and position.
 *
 * The feed must be one the account follows. A followed feed this browser never parsed gets its
 * first parse; an already parsed feed is not refreshed. Loading a different item stops the watch.
 * With Add by RSS off on this server, no first parse is requested.
 */
export function useAddByRSSMetadataUpgrade(): (target: AddByRSSMetadataUpgradeTarget) => void {
  const { mpAddByRSS, updateMPAddByRSSMetadata } = useMediaPlayer();
  const { loggedInAccount } = useAccount();
  const addByRSSEnabled = useConfig().public.catalog.addByRSSEnabled;
  const accountIdTextRef = useRef<string | null>(loggedInAccount?.id_text ?? null);
  const addByRSSEnabledRef = useRef(addByRSSEnabled);
  const armedRef = useRef<ArmedUpgrade | null>(null);
  const loadedIdentity = mpAddByRSS ? addByRSSPlaybackIdentity(mpAddByRSS.resourceData) : null;

  useEffect(() => {
    accountIdTextRef.current = loggedInAccount?.id_text ?? null;
  }, [loggedInAccount?.id_text]);

  useEffect(() => {
    addByRSSEnabledRef.current = addByRSSEnabled;
  }, [addByRSSEnabled]);

  const disarm = useCallback(() => {
    armedRef.current?.unsubscribe();
    armedRef.current = null;
  }, []);

  useEffect(() => {
    const armed = armedRef.current;
    if (armed !== null && loadedIdentity !== armed.target.identity) {
      disarm();
    }
  }, [loadedIdentity, disarm]);

  useEffect(() => disarm, [disarm]);

  const isArmed = useCallback(
    (target: AddByRSSMetadataUpgradeTarget) => armedRef.current?.target === target,
    []
  );

  const tryUpgrade = useCallback(
    async (target: AddByRSSMetadataUpgradeTarget): Promise<boolean> => {
      const found = await findAddByRSSItemInStoredFeed(target.resourceData);
      if (found === null || !isArmed(target)) {
        return false;
      }
      const resourceData = buildAddByRSSResourceData(found);
      if (addByRSSPlaybackIdentity(resourceData) !== target.identity) {
        return false;
      }
      updateMPAddByRSSMetadata({ idText: found.idText, resourceData });
      const handoff = readPlaybackHandoffLocalState();
      if (handoff !== null && handoff.itemIdText === target.identity) {
        writePlaybackHandoffLocalState({
          itemIdText: handoff.itemIdText,
          itemTitle: resourceData.title ?? handoff.itemTitle,
          lastPlayedAt: handoff.lastPlayedAt,
        });
      }
      disarm();
      return true;
    },
    [disarm, isArmed, updateMPAddByRSSMetadata]
  );

  return useCallback(
    (target: AddByRSSMetadataUpgradeTarget) => {
      disarm();
      const watchedFeedUrl = toAddByRSSFeedChangedUrl(target.feedUrl);
      const unsubscribe = onAddByRSSFeedChanged((changedFeedUrl) => {
        if (changedFeedUrl === watchedFeedUrl) {
          void tryUpgrade(target);
        }
      });
      armedRef.current = { target, unsubscribe };

      void (async () => {
        try {
          const accountIdText = accountIdTextRef.current;
          let isFollowed = await hasStoredAddByRSSFeed(target.feedUrl);
          if (!isFollowed && accountIdText !== null) {
            await syncAddByRSSFollowStubs(accountIdText);
            isFollowed = await hasStoredAddByRSSFeed(target.feedUrl);
          }
          if (!isArmed(target)) {
            return;
          }
          if (!isFollowed) {
            disarm();
            return;
          }
          if (
            (await tryUpgrade(target)) ||
            accountIdText === null ||
            !isArmed(target) ||
            !addByRSSEnabledRef.current
          ) {
            return;
          }
          await enqueueAddByRSSFirstParses({
            accountId: accountIdText,
            feedUrls: [target.feedUrl],
          });
        } catch (error: unknown) {
          console.error('Add by RSS metadata upgrade failed', error);
        }
      })();
    },
    [disarm, isArmed, tryUpgrade]
  );
}
