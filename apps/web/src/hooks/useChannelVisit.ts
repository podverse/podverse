'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { itemShowsUnseenDot } from '@podverse/helpers';

import type { ChannelVisitKey, ChannelVisitState } from '../lib/channelVisit/channelVisitStore';
import {
  beginChannelVisit,
  endChannelVisit,
  engageChannelVisitItem,
  getChannelVisitSnapshot,
  hasActiveChannelVisit,
  subscribeChannelVisit,
} from '../lib/channelVisit/channelVisitStore';

export function useChannelVisit(): ChannelVisitState | null {
  return useSyncExternalStore(subscribeChannelVisit, getChannelVisitSnapshot, () => null);
}

export function useChannelVisitActions(): {
  beginVisit: (key: ChannelVisitKey, frozenLastSeenAtMs: number | null) => void;
  engageItem: (itemId: string) => void;
  endVisit: () => void;
  hasActiveVisit: (key: ChannelVisitKey) => boolean;
} {
  const beginVisit = useCallback((key: ChannelVisitKey, frozenLastSeenAtMs: number | null) => {
    beginChannelVisit(key, frozenLastSeenAtMs);
  }, []);
  const engageItem = useCallback((itemId: string) => {
    engageChannelVisitItem(itemId);
  }, []);
  const endVisit = useCallback(() => {
    endChannelVisit();
  }, []);
  const hasActiveVisit = useCallback((key: ChannelVisitKey) => hasActiveChannelVisit(key), []);
  return { beginVisit, engageItem, endVisit, hasActiveVisit };
}

/**
 * Whether an item row on this channel visit should show the new-content dot.
 *
 * Live items stay undotted. A missing publish date or a visit that does not match the channel
 * shows nothing.
 */
export function useItemUnseenDot(params: {
  channelIdText: string | null | undefined;
  feedUrl?: string | null;
  isLive: boolean;
  itemIdText: string;
  pubDate: string | null | undefined;
}): boolean {
  const visit = useChannelVisit();
  if (params.isLive || visit === null) {
    return false;
  }

  const matchesChannel =
    params.channelIdText !== null &&
    params.channelIdText !== undefined &&
    visit.key.kind === 'channel' &&
    visit.key.channelIdText === params.channelIdText;
  const matchesFeed =
    params.feedUrl !== null &&
    params.feedUrl !== undefined &&
    visit.key.kind === 'add-by-rss' &&
    visit.key.feedUrl === params.feedUrl;

  if (!matchesChannel && !matchesFeed) {
    return false;
  }

  const pubDateMs =
    params.pubDate === null || params.pubDate === undefined || params.pubDate === ''
      ? null
      : Date.parse(params.pubDate);
  const resolvedPubDateMs = pubDateMs === null || Number.isNaN(pubDateMs) ? null : pubDateMs;

  return itemShowsUnseenDot({
    engagedItemIds: visit.engagedItemIds,
    itemId: params.itemIdText,
    lastSeenAtMs: visit.frozenLastSeenAtMs,
    pubDateMs: resolvedPubDateMs,
  });
}
