'use client';

import { useEffect, useState } from 'react';

import { PAGINATION } from '@podverse/helpers';

import {
  buildAddByRSSItemsIndex,
  selectNewestAddByRSSItemsFromFeeds,
} from '../utils/addByRSS/itemIndex';
import { getAllAddByRSSFeeds, getAllAddByRSSItems } from '../utils/addByRSS/storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSItemIndexItem,
  AddByRSSResourceType,
} from '../utils/addByRSS/types';
import { useReadyAddByRSSFeeds } from './useReadyAddByRSSFeeds';

const NEWEST_ITEM_LIMIT = PAGINATION.DEFAULT_LIMIT;

const EMPTY_ITEMS: AddByRSSItemIndexItem[] = [];

const LOADING_RESULT = { items: EMPTY_ITEMS, isReady: false };
const EMPTY_RESULT = { items: EMPTY_ITEMS, isReady: true };

type ItemRead = {
  feeds: readonly AddByRSSFeedRecord[];
  items: AddByRSSItemIndexItem[];
};

/**
 * The newest Add by RSS items from ready feeds of the given types on this browser.
 *
 * Items come from the parsed feed already in memory. The items index is read only for ids it
 * already stored, then rebuilt in the background. `isReady` stays false until that read
 * finishes. An empty feed list does no index work and follows the feeds hook.
 */
export function useSubscribedAddByRSSItems(resourceTypes: readonly AddByRSSResourceType[]): {
  items: AddByRSSItemIndexItem[];
  isReady: boolean;
} {
  const { feeds, isReady: feedsReady } = useReadyAddByRSSFeeds(resourceTypes);
  const [state, setState] = useState<ItemRead | null>(null);

  useEffect(() => {
    if (!feedsReady || feeds.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const indexed = await getAllAddByRSSItems();
        if (cancelled) {
          return;
        }
        const existingIdTextByCompositeId = new Map(
          indexed.map((item) => [item.id, item.idText])
        );
        const items = selectNewestAddByRSSItemsFromFeeds({
          feeds,
          limit: NEWEST_ITEM_LIMIT,
          existingIdTextByCompositeId,
        });
        if (cancelled) {
          return;
        }
        setState({ feeds, items });
        const seedIdTextByCompositeId = new Map(items.map((item) => [item.id, item.idText]));
        try {
          const storedFeeds = await getAllAddByRSSFeeds();
          if (cancelled) {
            return;
          }
          await buildAddByRSSItemsIndex(storedFeeds, seedIdTextByCompositeId);
        } catch (error) {
          console.error(error);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setState({ feeds, items: EMPTY_ITEMS });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [feeds, feedsReady]);

  if (!feedsReady) {
    return LOADING_RESULT;
  }
  if (feeds.length === 0) {
    return EMPTY_RESULT;
  }
  if (state === null || state.feeds !== feeds) {
    return LOADING_RESULT;
  }
  return { items: state.items, isReady: true };
}
