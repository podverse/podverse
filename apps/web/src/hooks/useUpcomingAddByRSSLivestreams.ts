'use client';

import { useEffect, useState } from 'react';

import {
  ADD_BY_RSS_RESOURCE_TYPES,
  addByRSSFeedMayHaveLivestreams,
} from '@podverse/parser-mapping';

import {
  buildAddByRSSLivestreamIndex,
  livestreamIndexItemsFromFeeds,
} from '../utils/addByRSS/itemIndex';
import { getAllAddByRSSFeeds, getAllAddByRSSLivestreamItems } from '../utils/addByRSS/storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSLivestreamIndexItem,
  AddByRSSResourceType,
} from '../utils/addByRSS/types';
import { selectUpcomingAddByRSSLivestreams } from '../utils/subscribed/mergeSubscribedLivestreams';
import { useReadyAddByRSSFeeds } from './useReadyAddByRSSFeeds';

const NO_TYPES: readonly AddByRSSResourceType[] = [];

const EMPTY_ITEMS: AddByRSSLivestreamIndexItem[] = [];

const LOADING_RESULT = { items: EMPTY_ITEMS, isReady: false };
const EMPTY_RESULT = { items: EMPTY_ITEMS, isReady: true };

type LivestreamRead = {
  feeds: readonly AddByRSSFeedRecord[];
  items: AddByRSSLivestreamIndexItem[];
};

const flaggedFeedIdTexts = (feeds: readonly AddByRSSFeedRecord[]): ReadonlySet<string> => {
  const ids = new Set<string>();
  for (const feed of feeds) {
    if (addByRSSFeedMayHaveLivestreams(feed.mayHaveLivestreams, feed.mappedFeed)) {
      ids.add(feed.idText);
    }
  }
  return ids;
};

/**
 * Upcoming Add by RSS livestreams from ready feeds of every resource type.
 *
 * A feed is included when it may have livestreams. Rows come from that feed's parsed live
 * items. The livestream index is read for stored ids, then rebuilt in the background.
 * `isReady` is true at once when inactive, and stays false until the read for the current
 * feeds finishes.
 */
export function useUpcomingAddByRSSLivestreams(active: boolean): {
  items: AddByRSSLivestreamIndexItem[];
  isReady: boolean;
} {
  const { feeds, isReady: feedsReady } = useReadyAddByRSSFeeds(
    active ? ADD_BY_RSS_RESOURCE_TYPES : NO_TYPES
  );
  const [state, setState] = useState<LivestreamRead | null>(null);

  useEffect(() => {
    if (!feedsReady) {
      return;
    }

    const flaggedIds = flaggedFeedIdTexts(feeds);
    if (flaggedIds.size === 0) {
      return;
    }

    let cancelled = false;
    const flaggedFeeds = feeds.filter((feed) => flaggedIds.has(feed.idText));

    void (async () => {
      try {
        const indexed = await getAllAddByRSSLivestreamItems();
        if (cancelled) {
          return;
        }
        const existingIdTextByCompositeId = new Map(indexed.map((item) => [item.id, item.idText]));
        const built = livestreamIndexItemsFromFeeds(flaggedFeeds, existingIdTextByCompositeId);
        if (cancelled) {
          return;
        }
        setState({
          feeds,
          items: selectUpcomingAddByRSSLivestreams(built, flaggedIds),
        });
        const seedIdTextByCompositeId = new Map(built.map((item) => [item.id, item.idText]));
        try {
          const storedFeeds = await getAllAddByRSSFeeds();
          if (cancelled) {
            return;
          }
          await buildAddByRSSLivestreamIndex(storedFeeds, seedIdTextByCompositeId);
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
  if (flaggedFeedIdTexts(feeds).size === 0) {
    return EMPTY_RESULT;
  }
  if (state === null || state.feeds !== feeds) {
    return LOADING_RESULT;
  }
  return { items: state.items, isReady: true };
}
