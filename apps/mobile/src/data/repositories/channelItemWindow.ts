import { FIFTEEN_MINUTES_MS, toEpochMsOrNull } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';

/**
 * The rules that decide how much of a server-backed channel is kept on the device, and what a sync
 * pass is entitled to do with what it fetched.
 *
 * Free of `expo-sqlite` and React Native so the parts that are easy to get wrong — the ceiling on
 * growth, idempotency across repeated runs, and which rows a pass may delete — are unit-testable in
 * node. `channelItemsRepository` owns the storage and the requests.
 *
 * Add-by-RSS feeds never pass through here. They are stored whole in their own bundle, because the
 * user chose them explicitly and there is no server-side pagination behind them to window against.
 */

/** Items kept for a channel before the user asks to see further back. */
export const CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH = 50;

/** How much further back one "show more" reaches. */
export const CHANNEL_ITEM_WINDOW_STEP = 50;

/**
 * Hard ceiling per channel. Every stored item carries its full payload so it can be read and played
 * with no connection, which is exactly why a decade-long weekly show cannot be allowed to keep
 * growing on a device that has other things to hold.
 */
export const CHANNEL_ITEM_WINDOW_MAX_DEPTH = 500;

/**
 * How long a channel's stored window is trusted before an opportunistic pass refreshes it.
 *
 * Without this, every foreground transition would re-fetch every subscription. A pull gesture is
 * somebody asking on purpose and ignores it.
 */
export const CHANNEL_ITEM_STALE_AFTER_MS = FIFTEEN_MINUTES_MS;

export type ChannelItemWindow = {
  channelIdText: string;
  depth: number;
  /** `null` until the first pass lands, which is also what makes a channel unconditionally stale. */
  syncedAtMs: number | null;
};

/** The columns a row is indexed and displayed by, alongside the payload it was derived from. */
export type ChannelItemRecord = {
  channelIdText: string;
  imageUrl: string | null;
  itemIdText: string;
  payload: DTOItem;
  pubDateMs: number | null;
  title: string | null;
};

export const clampChannelItemWindowDepth = (depth: number): number => {
  if (!Number.isFinite(depth)) {
    return CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH;
  }
  const rounded = Math.floor(depth);
  if (rounded < CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH) {
    return CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH;
  }
  return Math.min(rounded, CHANNEL_ITEM_WINDOW_MAX_DEPTH);
};

export const extendChannelItemWindowDepth = (depth: number): number => {
  return clampChannelItemWindowDepth(clampChannelItemWindowDepth(depth) + CHANNEL_ITEM_WINDOW_STEP);
};

export const isChannelItemWindowAtMaxDepth = (depth: number): boolean => {
  return clampChannelItemWindowDepth(depth) >= CHANNEL_ITEM_WINDOW_MAX_DEPTH;
};

/**
 * Whether a window walk needs another page, given what it has collected so far.
 *
 * A page shorter than the size the endpoint reports is the end of the feed, so the walk stops there
 * rather than spending a round trip to be told the same thing by an empty page.
 */
export const nextChannelItemPage = ({
  depth,
  fetchedCount,
  lastPage,
  lastPageCount,
  lastPageLimit,
}: {
  depth: number;
  fetchedCount: number;
  lastPage: number;
  lastPageCount: number;
  lastPageLimit: number;
}): number | null => {
  if (lastPageCount <= 0) {
    return null;
  }
  if (lastPageLimit > 0 && lastPageCount < lastPageLimit) {
    return null;
  }
  if (fetchedCount >= clampChannelItemWindowDepth(depth)) {
    return null;
  }
  return lastPage + 1;
};

/**
 * Whether a page that just landed was the last one the feed has, independent of whether the window
 * still had room. This is the difference between "there is nothing more to show" and "there is more
 * behind what you are looking at", which is what decides whether to offer to reach further back.
 */
export const isLastChannelItemPage = ({
  lastPageCount,
  lastPageLimit,
}: {
  lastPageCount: number;
  lastPageLimit: number;
}): boolean => {
  return lastPageCount <= 0 || (lastPageLimit > 0 && lastPageCount < lastPageLimit);
};

export const selectStaleChannelWindows = ({
  nowMs,
  staleAfterMs = CHANNEL_ITEM_STALE_AFTER_MS,
  windows,
}: {
  nowMs: number;
  staleAfterMs?: number;
  windows: readonly ChannelItemWindow[];
}): ChannelItemWindow[] => {
  return windows.filter((window) => {
    return window.syncedAtMs === null || nowMs - window.syncedAtMs >= staleAfterMs;
  });
};

export type StoredChannelItemKey = {
  itemIdText: string;
};

export type ChannelItemReconciliation<T extends StoredChannelItemKey> = {
  /** What the channel holds after this pass, newest first and already trimmed to the window. */
  keep: T[];
  /** Rows the channel no longer holds: pulled from the feed, or pushed past the window by newer ones. */
  removeIdTexts: string[];
};

/**
 * Decide what a completed window walk leaves behind.
 *
 * A walk always covers the channel's whole stored depth, so what it fetched *is* the channel — the
 * fetched set replaces the stored one rather than merging into it. That single property is what
 * makes repeated runs idempotent, retires items pulled from the feed, and keeps storage bounded as
 * new episodes push old ones past the window, without any of the three needing its own pass.
 *
 * Only call this with a walk that finished. A partial one describes a smaller channel than exists,
 * and committing it would delete every item the pages that failed would have carried.
 */
export const reconcileChannelItems = <T extends StoredChannelItemKey>({
  depth,
  fetched,
  stored,
}: {
  depth: number;
  fetched: readonly T[];
  stored: readonly StoredChannelItemKey[];
}): ChannelItemReconciliation<T> => {
  const keep: T[] = [];
  const keepIdTexts = new Set<string>();
  const limit = clampChannelItemWindowDepth(depth);

  for (const candidate of fetched) {
    if (keep.length >= limit) {
      break;
    }
    // A feed that publishes mid-walk shifts every page after it, so the same item can arrive twice.
    if (keepIdTexts.has(candidate.itemIdText) || candidate.itemIdText.length === 0) {
      continue;
    }
    keepIdTexts.add(candidate.itemIdText);
    keep.push(candidate);
  }

  const removeIdTexts: string[] = [];
  for (const row of stored) {
    if (!keepIdTexts.has(row.itemIdText)) {
      removeIdTexts.push(row.itemIdText);
    }
  }

  return { keep, removeIdTexts };
};

/**
 * The parts of an item artwork resolution actually reads. Narrower than `DTOItem` so the rule can
 * be exercised without building an entire channel graph around it.
 */
export type ChannelItemArtworkSource = {
  channel?: { channel_images?: { url: string }[] };
  item_images: { url: string }[];
};

/**
 * Artwork for an item, preferring its own over the channel's. Shared with the row mappers so a
 * stored item and a freshly fetched one never render different images.
 */
export const getItemPrimaryImageUrl = (item: ChannelItemArtworkSource): string | null => {
  const firstItemImage = item.item_images[0];
  if (firstItemImage) {
    return firstItemImage.url;
  }

  const firstChannelImage = item.channel?.channel_images?.[0];
  if (firstChannelImage) {
    return firstChannelImage.url;
  }

  return null;
};

/**
 * Flatten an item into the row it is stored as: indexed columns for ordering and display, plus the
 * payload itself so an offline reader gets the description, enclosures, and artwork it needs
 * without a second request.
 *
 * Returns `null` for an item with no `id_text`, which has no stable identity to store under.
 */
export const toChannelItemRecord = (
  channelIdText: string,
  item: DTOItem
): ChannelItemRecord | null => {
  const itemIdText = item.id_text.trim();
  if (itemIdText.length === 0) {
    return null;
  }

  return {
    channelIdText,
    imageUrl: getItemPrimaryImageUrl(item),
    itemIdText,
    payload: item,
    pubDateMs: toEpochMsOrNull(item.pub_date),
    title: item.title ?? null,
  };
};
