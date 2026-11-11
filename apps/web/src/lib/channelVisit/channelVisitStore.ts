/**
 * Visit-local unseen-dot state for a channel or add-by-RSS feed.
 *
 * Opening the channel freezes the previous last-seen timestamp for the visit. Item rows newer than
 * that stay dotted until the user leaves and opens the channel again. Playing a row, or opening its
 * detail, records that item id so only that row drops its dot immediately.
 *
 * Survives client navigations within the visit (channel → episode → back). A second open of the
 * same channel while the visit is still active does not remount-mark or clear engaged ids.
 */

export type ChannelVisitKey =
  { kind: 'channel'; channelIdText: string } | { kind: 'add-by-rss'; feedUrl: string };

export type ChannelVisitState = {
  engagedItemIds: ReadonlySet<string>;
  frozenLastSeenAtMs: number | null;
  key: ChannelVisitKey;
};

type Listener = () => void;

let visit: ChannelVisitState | null = null;
const listeners = new Set<Listener>();

const emit = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

export const getChannelVisitSnapshot = (): ChannelVisitState | null => visit;

export const subscribeChannelVisit = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const keysMatch = (left: ChannelVisitKey, right: ChannelVisitKey): boolean => {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === 'channel' && right.kind === 'channel') {
    return left.channelIdText === right.channelIdText;
  }
  if (left.kind === 'add-by-rss' && right.kind === 'add-by-rss') {
    return left.feedUrl === right.feedUrl;
  }
  return false;
};

/**
 * Start or keep a visit for this channel or feed.
 *
 * When the same visit is already active, the frozen timestamp and engaged ids stay as they are so
 * returning from an item page does not remount-mark and bring dots back.
 */
export const beginChannelVisit = (
  key: ChannelVisitKey,
  frozenLastSeenAtMs: number | null
): void => {
  if (visit !== null && keysMatch(visit.key, key)) {
    return;
  }
  visit = {
    engagedItemIds: new Set(),
    frozenLastSeenAtMs,
    key,
  };
  emit();
};

/** Whether this key already has an active visit, so a remount should not mark again. */
export const hasActiveChannelVisit = (key: ChannelVisitKey): boolean => {
  return visit !== null && keysMatch(visit.key, key);
};

export const engageChannelVisitItem = (itemId: string): void => {
  if (visit === null || itemId.length === 0 || visit.engagedItemIds.has(itemId)) {
    return;
  }
  const next = new Set(visit.engagedItemIds);
  next.add(itemId);
  visit = { ...visit, engagedItemIds: next };
  emit();
};

/** Drop the visit when the user leaves for a page that is not part of it. */
export const endChannelVisit = (): void => {
  if (visit === null) {
    return;
  }
  visit = null;
  emit();
};

export const channelVisitKeyMatchesChannel = (
  key: ChannelVisitKey,
  channelIdText: string
): boolean => {
  return key.kind === 'channel' && key.channelIdText === channelIdText;
};

export const channelVisitKeyMatchesFeedUrl = (key: ChannelVisitKey, feedUrl: string): boolean => {
  return key.kind === 'add-by-rss' && key.feedUrl === feedUrl;
};
