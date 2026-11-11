import { itemShowsUnseenDot } from '@podverse/helpers';

/**
 * Numbers below this are seconds. `1e12` milliseconds is 2001-09-09, and every publish instant
 * this app stores as milliseconds is past that.
 */
const EPOCH_MS_FLOOR = 1e12;

/**
 * Parse a row `updatedAt` into epoch milliseconds.
 *
 * Empty, null, and undefined are missing. A number below `1e12` is seconds. Anything else is
 * passed to `Date`. An unparseable value is null.
 */
export const epochMsFromRowUpdatedAt = (
  value: string | number | null | undefined
): number | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed =
    typeof value === 'number' && value < EPOCH_MS_FLOOR ? new Date(value * 1000) : new Date(value);
  const epochMs = parsed.getTime();
  return Number.isNaN(epochMs) ? null : epochMs;
};

/**
 * Whether an item row shows the new-content dot.
 *
 * Channel rows never do: their dot is the side rail. Undefined or null last-seen means this
 * visit has not read a timestamp, or the subscription was never opened, and neither case is new.
 * An item id in `engagedItemIds` was played or opened during this visit and drops its dot.
 */
export const itemRowShowsUnseenDot = (
  isChannelList: boolean,
  updatedAt: string | number | null | undefined,
  lastSeenAtMs: number | null | undefined,
  itemId?: string | null,
  engagedItemIds?: ReadonlySet<string> | null
): boolean => {
  if (isChannelList || lastSeenAtMs === undefined || lastSeenAtMs === null) {
    return false;
  }
  return itemShowsUnseenDot({
    engagedItemIds,
    itemId,
    lastSeenAtMs,
    pubDateMs: epochMsFromRowUpdatedAt(updatedAt),
  });
};
