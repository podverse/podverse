import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation/client';

import {
  DEVICE_PLAYBACK_ACCOUNT_ID,
  DEVICE_PLAYBACK_QUEUE_ID,
} from '../lib/playback/devicePlaybackKey';
import { sectionChromeCacheKey } from '../lib/sectionChromeFlags';
import type {
  IdentityAutoDownload,
  IdentityAutoDownloadItem,
  IdentityDownload,
  IdentityLiveStatus,
  IdentityPlayableItem,
  IdentityPlayback,
  IdentitySectionChrome,
  IdentitySeen,
} from './identityRemap';
import {
  preferCompletedThenFurther,
  preferLaterTimestamp,
  preferUnmovedRow,
  rewriteJsonIdTexts,
} from './identityRemap';
import type { ChannelAutoDownloadSource } from './repositories/autoDownloadRepository';
import type { PlayableItemSource } from './repositories/playableItemRepository';
import type { PlaybackOutboxResourceKind } from './repositories/playbackOutbox';
import type { SubscriptionKind } from './repositories/types';

const ADD_BY_RSS_KIND: SubscriptionKind = 'add-by-rss';
const DIRECTORY_KIND: SubscriptionKind = 'channel';
const ADD_BY_RSS_RESOURCE: PlaybackOutboxResourceKind = 'add_by_rss';
const ITEM_RESOURCE: PlaybackOutboxResourceKind = 'item';
const ADD_BY_RSS_SOURCE: ChannelAutoDownloadSource = 'add_by_rss';
const DIRECTORY_SOURCE: ChannelAutoDownloadSource = 'directory';
const DOWNLOAD_SOURCE: PlayableItemSource = 'download';

/**
 * One listing an Add by RSS artist keeps. Rows whose publisher is the feed being promoted are
 * removed. A listing of the promoted album becomes a directory channel.
 */
export type PromotionListedFeed = {
  artworkChecked: boolean;
  channelIdText: string | null;
  channelTitle: string | null;
  feedGuid: string;
  feedUrl: string | null;
  imageUrl: string | null;
  itemGuids: string[];
  kind: 'add_by_rss' | 'directory' | 'unresolved';
  listedAtChannelLevel: boolean;
  mediumId: number | null;
  pendingRequestId: string | null;
  position: number;
  publisherFeedUrl: string;
  title: string | null;
  unresolvedReason: string | null;
};

export type PromotionOutbox = {
  completed: boolean;
  id: number;
  playbackPosition: number;
  resourceIdText: string;
  resourceKind: string;
};

/** The local rows a promotion may rewrite. Credential rows are never included. */
export type AddByRssPromotionSnapshot = {
  autoDownloadCandidates: IdentityAutoDownloadItem[];
  autoDownloadChannels: IdentityAutoDownload[];
  channelLive: IdentityLiveStatus[];
  channelSeen: IdentitySeen[];
  downloads: IdentityDownload[];
  /**
   * The feed row's `playback_position` text. One number is the position playback stamps on every
   * episode. A JSON object maps a hash or download id to seconds. Null once the feed row is gone.
   */
  feedPlaybackPosition: string | null;
  listedFeeds: PromotionListedFeed[];
  playableItems: IdentityPlayableItem[];
  playback: IdentityPlayback[];
  playbackOutbox: PromotionOutbox[];
  sectionChrome: IdentitySectionChrome[];
  subscribedChannelIds: string[];
};

export type AddByRssPromotionMove = {
  channelIdText: string;
  channelTitle: string | null;
  feedUrl: string;
  items: { downloadIdText: string; hashId: string; itemIdText: string }[];
  mediumId: number | null;
};

export type AddByRssPromotionRemapResult = {
  downloadFilesToDelete: string[];
  movedDownloadItemIds: { fromItemIdText: string; toItemIdText: string }[];
  snapshot: AddByRssPromotionSnapshot;
};

const comparableFeedUrl = (feedUrl: string): string => {
  return canonicalAddByRSSFeedUrl(feedUrl) ?? feedUrl.trim();
};

const groupBy = <T>(rows: readonly T[], keyOf: (row: T) => string): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
};

const finiteSeconds = (value: unknown): number | null => {
  const seconds =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
};

/**
 * The feed column is one string. A JSON object is per-episode seconds keyed by hash or download
 * id. Anything else that parses as a positive number is the position playback stamps on every
 * episode of the feed.
 */
const readFeedPositions = (
  raw: string | null
): { all: number | null; byKey: ReadonlyMap<string, number> } => {
  if (raw === null) {
    return { all: null, byKey: new Map() };
  }
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '0') {
    return { all: null, byKey: new Map() };
  }
  if (trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const byKey = new Map<string, number>();
        for (const [key, value] of Object.entries(parsed)) {
          const seconds = finiteSeconds(value);
          if (seconds !== null) {
            byKey.set(key, seconds);
          }
        }
        return { all: null, byKey };
      }
    } catch {
      // A non-object string falls through to the single-position reading.
    }
  }
  return { all: finiteSeconds(trimmed), byKey: new Map() };
};

const nextDownloads = (
  rows: readonly IdentityDownload[],
  channelIdText: string,
  downloadToItem: ReadonlyMap<string, string>
): {
  filesToDelete: string[];
  moved: { fromItemIdText: string; toItemIdText: string }[];
  rows: IdentityDownload[];
} => {
  const tagged = rows.map((row) => {
    const nextId = downloadToItem.get(row.itemIdText);
    return {
      originalItemIdText: row.itemIdText,
      row: nextId === undefined ? row : { ...row, channelIdText, itemIdText: nextId },
    };
  });
  const filesToDelete: string[] = [];
  const moved: { fromItemIdText: string; toItemIdText: string }[] = [];
  const next: IdentityDownload[] = [];
  for (const group of groupBy(tagged, (entry) => entry.row.itemIdText).values()) {
    const preferred = preferUnmovedRow(
      group,
      (entry) => entry.originalItemIdText === entry.row.itemIdText
    );
    next.push(preferred.row);
    if (preferred.originalItemIdText !== preferred.row.itemIdText) {
      moved.push({
        fromItemIdText: preferred.originalItemIdText,
        toItemIdText: preferred.row.itemIdText,
      });
    }
    for (const entry of group) {
      if (entry === preferred) {
        continue;
      }
      if (entry.row.filePath !== null && entry.row.filePath !== preferred.row.filePath) {
        filesToDelete.push(entry.row.filePath);
      }
    }
  }
  return { filesToDelete, moved, rows: next };
};

const itemIdForResource = (
  resourceIdText: string,
  hashToItem: ReadonlyMap<string, string>,
  downloadToItem: ReadonlyMap<string, string>
): string | undefined => {
  return hashToItem.get(resourceIdText) ?? downloadToItem.get(resourceIdText);
};

const nextPlayback = (
  rows: readonly IdentityPlayback[],
  move: AddByRssPromotionMove,
  feedPlaybackPosition: string | null,
  hashToItem: ReadonlyMap<string, string>,
  downloadToItem: ReadonlyMap<string, string>
): IdentityPlayback[] => {
  const retargeted = rows.map((row) => {
    if (row.resourceKind !== ADD_BY_RSS_RESOURCE) {
      return row;
    }
    const itemIdText = itemIdForResource(row.resourceIdText, hashToItem, downloadToItem);
    if (itemIdText === undefined) {
      return row;
    }
    return { ...row, resourceIdText: itemIdText, resourceKind: ITEM_RESOURCE };
  });
  const parsed = readFeedPositions(feedPlaybackPosition);
  const synthetic: IdentityPlayback[] = [];
  for (const item of move.items) {
    const seconds =
      parsed.byKey.get(item.hashId) ?? parsed.byKey.get(item.downloadIdText) ?? parsed.all;
    if (seconds === null) {
      continue;
    }
    const already = retargeted.find(
      (row) => row.resourceKind === ITEM_RESOURCE && row.resourceIdText === item.itemIdText
    );
    synthetic.push({
      accountIdText: already?.accountIdText ?? DEVICE_PLAYBACK_ACCOUNT_ID,
      completed: false,
      lastMeaningfulAt: already?.lastMeaningfulAt ?? 0,
      mediaFileDuration: null,
      playbackPosition: seconds,
      queueIdText: already?.queueIdText ?? DEVICE_PLAYBACK_QUEUE_ID,
      resourceIdText: item.itemIdText,
      resourceKind: ITEM_RESOURCE,
      zone: already?.zone ?? 'history',
    });
  }
  const next: IdentityPlayback[] = [];
  for (const group of groupBy(
    [...retargeted, ...synthetic],
    (row) => `${row.accountIdText}\0${row.queueIdText}\0${row.resourceKind}\0${row.resourceIdText}`
  ).values()) {
    const preferred = preferCompletedThenFurther(group);
    const completed = group.some((row) => row.completed);
    next.push({ ...preferred, completed });
  }
  return next;
};

const nextOutbox = (
  rows: readonly PromotionOutbox[],
  hashToItem: ReadonlyMap<string, string>,
  downloadToItem: ReadonlyMap<string, string>
): PromotionOutbox[] => {
  const retargeted = rows.map((row) => {
    if (row.resourceKind !== ADD_BY_RSS_RESOURCE) {
      return row;
    }
    const itemIdText = itemIdForResource(row.resourceIdText, hashToItem, downloadToItem);
    if (itemIdText === undefined) {
      return row;
    }
    return { ...row, resourceIdText: itemIdText, resourceKind: ITEM_RESOURCE };
  });
  const next: PromotionOutbox[] = [];
  for (const group of groupBy(
    retargeted,
    (row) => `${row.resourceKind}\0${row.resourceIdText}`
  ).values()) {
    const preferred = preferCompletedThenFurther(group);
    next.push({ ...preferred, completed: group.some((row) => row.completed) });
  }
  return next;
};

const nextSeen = (rows: readonly IdentitySeen[], move: AddByRssPromotionMove): IdentitySeen[] => {
  const retargeted = rows.map((row) =>
    row.key === move.feedUrl && row.kind === ADD_BY_RSS_KIND
      ? { ...row, key: move.channelIdText, kind: DIRECTORY_KIND }
      : row
  );
  return [...groupBy(retargeted, (row) => row.key).values()].map((group) =>
    preferLaterTimestamp(group)
  );
};

const nextLive = (
  rows: readonly IdentityLiveStatus[],
  move: AddByRssPromotionMove
): IdentityLiveStatus[] => {
  const retargeted = rows.map((row) =>
    row.key === move.feedUrl && row.kind === ADD_BY_RSS_KIND
      ? { ...row, key: move.channelIdText, kind: DIRECTORY_KIND }
      : row
  );
  return [...groupBy(retargeted, (row) => row.key).values()].map((group) =>
    preferLaterTimestamp(group)
  );
};

const nextAutoDownloadChannels = (
  rows: readonly IdentityAutoDownload[],
  move: AddByRssPromotionMove
): IdentityAutoDownload[] => {
  const tagged = rows.map((row) => ({
    originalChannelIdText: row.channelIdText,
    originalSource: row.source,
    row:
      row.channelIdText === move.feedUrl && row.source === ADD_BY_RSS_SOURCE
        ? { ...row, channelIdText: move.channelIdText, source: DIRECTORY_SOURCE }
        : row,
  }));
  const next: IdentityAutoDownload[] = [];
  for (const group of groupBy(tagged, (entry) => entry.row.channelIdText).values()) {
    const preferred = preferUnmovedRow(
      group,
      (entry) =>
        entry.originalChannelIdText === entry.row.channelIdText &&
        entry.originalSource === DIRECTORY_SOURCE
    );
    next.push(preferred.row);
  }
  return next;
};

const nextAutoDownloadCandidates = (
  rows: readonly IdentityAutoDownloadItem[],
  channelIdText: string,
  downloadToItem: ReadonlyMap<string, string>,
  hashToItem: ReadonlyMap<string, string>
): IdentityAutoDownloadItem[] => {
  const tagged = rows.map((row) => {
    const nextId = itemIdForResource(row.itemIdText, hashToItem, downloadToItem);
    return {
      originalItemIdText: row.itemIdText,
      row: nextId === undefined ? row : { ...row, channelIdText, itemIdText: nextId },
    };
  });
  const next: IdentityAutoDownloadItem[] = [];
  for (const group of groupBy(tagged, (entry) => entry.row.itemIdText).values()) {
    const preferred = preferUnmovedRow(
      group,
      (entry) => entry.originalItemIdText === entry.row.itemIdText
    );
    next.push(preferred.row);
  }
  return next;
};

const retargetChromeKey = (
  key: string,
  move: AddByRssPromotionMove,
  hashToItem: ReadonlyMap<string, string>,
  downloadToItem: ReadonlyMap<string, string>
): string => {
  if (key === sectionChromeCacheKey('channel', move.feedUrl)) {
    return sectionChromeCacheKey('channel', move.channelIdText);
  }
  const itemPrefix = 'item:';
  if (key.startsWith(itemPrefix)) {
    const idText = key.slice(itemPrefix.length);
    const nextId = itemIdForResource(idText, hashToItem, downloadToItem);
    if (nextId !== undefined) {
      return sectionChromeCacheKey('item', nextId);
    }
  }
  return key;
};

const nextSectionChrome = (
  rows: readonly IdentitySectionChrome[],
  move: AddByRssPromotionMove,
  hashToItem: ReadonlyMap<string, string>,
  downloadToItem: ReadonlyMap<string, string>
): IdentitySectionChrome[] => {
  const tagged = rows.map((row) => ({
    originalKey: row.key,
    row: {
      ...row,
      key: retargetChromeKey(row.key, move, hashToItem, downloadToItem),
    },
  }));
  const next: IdentitySectionChrome[] = [];
  for (const group of groupBy(tagged, (entry) => entry.row.key).values()) {
    const preferred = preferUnmovedRow(group, (entry) => entry.originalKey === entry.row.key);
    next.push(preferred.row);
  }
  return next;
};

const nextPlayable = (
  rows: readonly IdentityPlayableItem[],
  hashToItem: ReadonlyMap<string, string>,
  downloadToItem: ReadonlyMap<string, string>
): IdentityPlayableItem[] => {
  const textMoves = new Map<string, string>([...hashToItem, ...downloadToItem]);
  const tagged = rows.map((row) => {
    if (row.source !== DOWNLOAD_SOURCE) {
      return { originalItemIdText: row.itemIdText, row };
    }
    const nextId = itemIdForResource(row.itemIdText, hashToItem, downloadToItem);
    if (nextId === undefined) {
      return { originalItemIdText: row.itemIdText, row };
    }
    return {
      originalItemIdText: row.itemIdText,
      row: {
        ...row,
        itemIdText: nextId,
        payloadJson: rewriteJsonIdTexts(row.payloadJson, textMoves),
      },
    };
  });
  const next: IdentityPlayableItem[] = [];
  for (const group of groupBy(
    tagged,
    (entry) => `${entry.row.itemIdText}\0${entry.row.source}`
  ).values()) {
    const preferred = preferUnmovedRow(
      group,
      (entry) => entry.originalItemIdText === entry.row.itemIdText
    );
    next.push(preferred.row);
  }
  return next;
};

const nextListedFeeds = (
  rows: readonly PromotionListedFeed[],
  move: AddByRssPromotionMove
): PromotionListedFeed[] => {
  const feedUrl = comparableFeedUrl(move.feedUrl);
  const next: PromotionListedFeed[] = [];
  for (const row of rows) {
    if (comparableFeedUrl(row.publisherFeedUrl) === feedUrl) {
      continue;
    }
    if (
      row.kind === 'add_by_rss' &&
      row.feedUrl !== null &&
      comparableFeedUrl(row.feedUrl) === feedUrl
    ) {
      next.push({
        ...row,
        channelIdText: move.channelIdText,
        channelTitle: move.channelTitle ?? row.channelTitle,
        feedUrl: null,
        kind: 'directory',
        mediumId: move.mediumId,
        pendingRequestId: null,
        unresolvedReason: null,
      });
      continue;
    }
    next.push(row);
  }
  return next;
};

/**
 * Rewrite one Add by RSS feed onto a directory channel.
 *
 * Rows for an episode the move does not name stay as they are. Running the result again, with
 * the feed position cleared, changes nothing.
 */
export const addByRssPromotionRemap = (
  snapshot: AddByRssPromotionSnapshot,
  move: AddByRssPromotionMove
): AddByRssPromotionRemapResult => {
  const hashToItem = new Map<string, string>();
  const downloadToItem = new Map<string, string>();
  for (const item of move.items) {
    hashToItem.set(item.hashId, item.itemIdText);
    downloadToItem.set(item.downloadIdText, item.itemIdText);
  }
  const downloads = nextDownloads(snapshot.downloads, move.channelIdText, downloadToItem);
  const subscribedChannelIds = snapshot.subscribedChannelIds.includes(move.channelIdText)
    ? snapshot.subscribedChannelIds
    : [...snapshot.subscribedChannelIds, move.channelIdText];

  return {
    downloadFilesToDelete: downloads.filesToDelete,
    movedDownloadItemIds: downloads.moved,
    snapshot: {
      autoDownloadCandidates: nextAutoDownloadCandidates(
        snapshot.autoDownloadCandidates,
        move.channelIdText,
        downloadToItem,
        hashToItem
      ),
      autoDownloadChannels: nextAutoDownloadChannels(snapshot.autoDownloadChannels, move),
      channelLive: nextLive(snapshot.channelLive, move),
      channelSeen: nextSeen(snapshot.channelSeen, move),
      downloads: downloads.rows,
      feedPlaybackPosition: null,
      listedFeeds: nextListedFeeds(snapshot.listedFeeds, move),
      playableItems: nextPlayable(snapshot.playableItems, hashToItem, downloadToItem),
      playback: nextPlayback(
        snapshot.playback,
        move,
        snapshot.feedPlaybackPosition,
        hashToItem,
        downloadToItem
      ),
      playbackOutbox: nextOutbox(snapshot.playbackOutbox, hashToItem, downloadToItem),
      sectionChrome: nextSectionChrome(snapshot.sectionChrome, move, hashToItem, downloadToItem),
      subscribedChannelIds,
    },
  };
};
