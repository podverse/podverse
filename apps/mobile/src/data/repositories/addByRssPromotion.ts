import { and, eq } from 'drizzle-orm';

import type { DTOAddByRSSMatchFeed, DTOChannelDirectoryMatch } from '@podverse/helpers/dto';
import { ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS } from '@podverse/helpers/dto';
import { getErrorResponseStatus } from '@podverse/helpers/error';

import {
  requestWithMobileAuthRefresh,
  requestWithoutMobileAuth,
} from '../../auth/authRequestWithRefresh';
import { downloadStore } from '../../downloads/downloadStore';
import type {
  AddByRssMatchFeedInput,
  LocalAddByRssItemRef,
} from '../../lib/addByRss/directoryMatch';
import { buildAddByRssMatchRefs, localItemRefsForFeed } from '../../lib/addByRss/directoryMatch';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import type {
  AddByRssPromotionMove,
  AddByRssPromotionSnapshot,
  PromotionListedFeed,
  PromotionOutbox,
} from '../addByRssPromotionRemap';
import { addByRssPromotionRemap } from '../addByRssPromotionRemap';
import { getDb, initializeDatabase, schema } from '../db';
import type { AppDatabase } from '../db';
import type { DownloadRow } from '../db/schema';
import type { IdentityPlayback } from '../identityRemap';
import { reprojectLibraryChildrenForChannel, reprojectLibraryIndex } from '../nativeCache';
import { rowToListedFeedRecord } from './addByRssListedFeeds';
import { addByRssRepository } from './addByRssRepository';
import { formatDirectoryChannelGoneDetail } from './directoryChannelGone';
import { downloadsRepository } from './downloadsRepository';
import type { PlaybackOutboxResourceKind } from './playbackOutbox';
import { playableItemRepository } from './playableItemRepository';
import { playlistRepository } from './playlistRepository';
import { queueRepository } from './queueRepository';
import type { SubscribedChannel } from './subscriptionsMerge';
import { mapDirectoryChannelToSubscribed } from './subscriptionsMerge';
import { subscriptionsRepository } from './subscriptionsRepository';
import { syncEventLogRepository } from './syncEventLogRepository';
import type { MobileAuthRequestContext } from './types';

export const ADD_BY_RSS_PROMOTED_CODE = 'add_by_rss_promoted_to_directory';

const ADD_BY_RSS_RESOURCE: PlaybackOutboxResourceKind = 'add_by_rss';

/** The handle `getDb().transaction` passes its callback. Sync SQLite returns that handle directly. */
const promotionTransaction = (db: AppDatabase) => db.transaction((tx) => tx);

type PromotionTransaction = ReturnType<typeof promotionTransaction>;

const playbackKey = (row: IdentityPlayback): string => {
  return `${row.accountIdText}\0${row.queueIdText}\0${row.resourceKind}\0${row.resourceIdText}`;
};

const listedKey = (row: PromotionListedFeed): string => {
  return `${row.publisherFeedUrl}\0${row.feedGuid}`;
};

const loadSnapshot = async (feedUrl: string): Promise<AddByRssPromotionSnapshot> => {
  await initializeDatabase();
  const db = getDb();
  const [
    downloads,
    playback,
    outbox,
    seen,
    live,
    chrome,
    autoChannels,
    autoItems,
    playable,
    listed,
    subscribed,
    feedRows,
  ] = await Promise.all([
    db.select().from(schema.download),
    db.select().from(schema.playbackLocalState),
    db.select().from(schema.playbackOutbox),
    db.select().from(schema.channelSeen),
    db.select().from(schema.channelLiveStatus),
    db.select().from(schema.sectionChromeFlags),
    db.select().from(schema.channelAutoDownload),
    db.select().from(schema.autoDownloadCandidate),
    db.select().from(schema.playableItem),
    db.select().from(schema.addByRssListedFeed),
    db.select({ idText: schema.subscribedChannel.idText }).from(schema.subscribedChannel),
    db
      .select({ playbackPosition: schema.addByRssFeed.playbackPosition })
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl))
      .limit(1),
  ]);

  return {
    autoDownloadCandidates: autoItems.map((row) => ({
      channelIdText: row.channelIdText,
      itemIdText: row.itemIdText,
      status: row.status,
    })),
    autoDownloadChannels: autoChannels.map((row) => ({
      allowCellular: row.allowCellular,
      channelIdText: row.channelIdText,
      enabled: row.enabled,
      enabledAt: row.enabledAt,
      source: row.source,
    })),
    channelLive: live.map((row) => ({
      at: row.updatedAt,
      key: row.subscriptionKey,
      kind: row.kind,
      statusId: row.statusId,
    })),
    channelSeen: seen.map((row) => ({
      at: row.lastSeenAt,
      key: row.subscriptionKey,
      kind: row.kind,
    })),
    downloads: downloads.map((row) => ({
      channelIdText: row.channelIdText,
      filePath: row.filePath,
      itemIdText: row.itemIdText,
    })),
    feedPlaybackPosition: feedRows[0]?.playbackPosition ?? null,
    listedFeeds: listed.map((row) => {
      const record = rowToListedFeedRecord(row);
      return {
        artworkChecked: record.artworkChecked,
        channelIdText: record.channelIdText,
        channelTitle: record.channelTitle,
        feedGuid: record.feedGuid,
        feedUrl: record.feedUrl,
        imageUrl: record.imageUrl,
        itemGuids: record.itemGuids,
        kind: record.kind,
        listedAtChannelLevel: record.listedAtChannelLevel,
        mediumId: record.mediumId,
        pendingRequestId: record.pendingRequestId,
        position: record.position,
        publisherFeedUrl: record.publisherFeedUrl,
        title: record.title,
        unresolvedReason: record.unresolvedReason,
      };
    }),
    playableItems: playable.map((row) => ({
      itemIdText: row.itemIdText,
      payloadJson: row.payloadJson,
      source: row.source,
    })),
    playback: playback.map((row) => ({
      accountIdText: row.accountIdText,
      completed: row.completed === 1,
      lastMeaningfulAt: row.lastMeaningfulAt,
      mediaFileDuration: row.mediaFileDuration,
      playbackPosition: row.playbackPosition,
      queueIdText: row.queueIdText,
      resourceIdText: row.resourceIdText,
      resourceKind: row.resourceKind,
      zone: row.zone,
    })),
    playbackOutbox: outbox.map((row) => ({
      completed: row.completed === 1,
      id: row.id,
      playbackPosition: row.playbackPosition ?? 0,
      resourceIdText: row.resourceIdText,
      resourceKind: row.resourceKind,
    })),
    sectionChrome: chrome.map((row) => ({
      flagsJson: row.flagsJson,
      key: row.cacheKey,
      updatedAt: row.updatedAt,
    })),
    subscribedChannelIds: subscribed.map((row) => row.idText),
  };
};

const referencedKeys = async (): Promise<Set<string>> => {
  const db = getDb();
  const [downloads, playback, outbox, candidates, chrome] = await Promise.all([
    db.select({ itemIdText: schema.download.itemIdText }).from(schema.download),
    db
      .select({ resourceIdText: schema.playbackLocalState.resourceIdText })
      .from(schema.playbackLocalState)
      .where(eq(schema.playbackLocalState.resourceKind, ADD_BY_RSS_RESOURCE)),
    db
      .select({ resourceIdText: schema.playbackOutbox.resourceIdText })
      .from(schema.playbackOutbox)
      .where(eq(schema.playbackOutbox.resourceKind, ADD_BY_RSS_RESOURCE)),
    db
      .select({ itemIdText: schema.autoDownloadCandidate.itemIdText })
      .from(schema.autoDownloadCandidate),
    db.select({ cacheKey: schema.sectionChromeFlags.cacheKey }).from(schema.sectionChromeFlags),
  ]);
  const keys = new Set<string>();
  for (const row of downloads) {
    keys.add(row.itemIdText);
  }
  for (const row of playback) {
    keys.add(row.resourceIdText);
  }
  for (const row of outbox) {
    keys.add(row.resourceIdText);
  }
  for (const row of candidates) {
    keys.add(row.itemIdText);
  }
  for (const row of chrome) {
    if (row.cacheKey.startsWith('item:')) {
      keys.add(row.cacheKey.slice('item:'.length));
    }
  }
  return keys;
};

/** Episodes this phone already stores, in the order a match response is paired against. */
const localRefsForFeedUrl = async (feedUrl: string): Promise<LocalAddByRssItemRef[]> => {
  const record = await addByRssRepository.getFeedByUrl(feedUrl);
  if (record === null) {
    return [];
  }
  const mappedFeed = await addByRssRepository.getMappedFeedByUrl(feedUrl);
  if (mappedFeed === null) {
    return [];
  }
  return localItemRefsForFeed(record, mappedFeed, await referencedKeys()).slice(
    0,
    ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS
  );
};

const matchFeedForUrl = async (
  feedUrl: string,
  requiresCredentials: boolean
): Promise<AddByRssMatchFeedInput | null> => {
  const record = await addByRssRepository.getFeedByUrl(feedUrl);
  if (record === null) {
    return null;
  }
  const [guidRows, refs] = await Promise.all([
    getDb()
      .select({ podcastGuid: schema.addByRssFeed.podcastGuid })
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl))
      .limit(1),
    localRefsForFeedUrl(feedUrl),
  ]);
  return {
    channelIdText: record.idText,
    feedUrl,
    items: refs.map((ref) => ({ enclosureUrl: ref.enclosureUrl, guid: ref.guid })),
    podcastGuid: guidRows[0]?.podcastGuid ?? null,
    requiresCredentials,
  };
};

/**
 * A convert response names episodes by hash. The local move pairs match items with stored
 * episodes by position, so the items stay in stored-episode order and an unmapped hash is null.
 */
const matchFromConvertedItems = async (
  feedUrl: string,
  channel: DTOChannelDirectoryMatch,
  converted: readonly { add_by_rss_hash_id: string; item_id_text: string }[]
): Promise<DTOAddByRSSMatchFeed> => {
  const refs = await localRefsForFeedUrl(feedUrl);
  const itemIdByHash = new Map(
    converted.map((item) => [item.add_by_rss_hash_id, item.item_id_text])
  );
  return {
    channel,
    feed_url: feedUrl,
    items: refs.map((ref) => ({
      enclosure_url: ref.enclosureUrl,
      guid: ref.guid,
      item_id_text: itemIdByHash.get(ref.hashId) ?? null,
    })),
  };
};

const moveForMatch = async (
  feedUrl: string,
  match: DTOAddByRSSMatchFeed
): Promise<AddByRssPromotionMove> => {
  const refs = await localRefsForFeedUrl(feedUrl);
  const items: AddByRssPromotionMove['items'] = [];
  for (let index = 0; index < refs.length && index < match.items.length; index += 1) {
    const ref = refs[index];
    const matched = match.items[index];
    if (ref === undefined || matched === undefined || matched.item_id_text === null) {
      continue;
    }
    items.push({
      downloadIdText: ref.downloadIdText,
      hashId: ref.hashId,
      itemIdText: matched.item_id_text,
    });
  }
  return {
    channelIdText: match.channel?.id_text ?? '',
    channelTitle: match.channel?.title ?? null,
    feedUrl,
    items,
    mediumId: match.channel?.medium_id ?? null,
  };
};

const persistDownloads = async (
  transaction: PromotionTransaction,
  before: AddByRssPromotionSnapshot,
  after: AddByRssPromotionSnapshot,
  moved: { fromItemIdText: string; toItemIdText: string }[],
  fullById: ReadonlyMap<string, DownloadRow>
): Promise<void> => {
  const beforeById = new Map(before.downloads.map((row) => [row.itemIdText, row]));
  const afterIds = new Set(after.downloads.map((row) => row.itemIdText));
  for (const move of moved) {
    const source = fullById.get(move.fromItemIdText);
    if (source === undefined || fullById.has(move.toItemIdText)) {
      continue;
    }
    const next = after.downloads.find((row) => row.itemIdText === move.toItemIdText);
    await transaction.insert(schema.download).values({
      ...source,
      channelIdText: next?.channelIdText ?? source.channelIdText,
      itemIdText: move.toItemIdText,
    });
  }
  for (const row of before.downloads) {
    if (!afterIds.has(row.itemIdText)) {
      await transaction.delete(schema.download).where(eq(schema.download.itemIdText, row.itemIdText));
    }
  }
  for (const row of after.downloads) {
    const previous = beforeById.get(row.itemIdText);
    if (previous !== undefined && previous.channelIdText !== row.channelIdText) {
      await transaction
        .update(schema.download)
        .set({ channelIdText: row.channelIdText })
        .where(eq(schema.download.itemIdText, row.itemIdText));
    }
  }
};

const persistPlayback = async (
  transaction: PromotionTransaction,
  before: readonly IdentityPlayback[],
  after: readonly IdentityPlayback[]
): Promise<void> => {
  const beforeByKey = new Map(before.map((row) => [playbackKey(row), row]));
  const afterByKey = new Map(after.map((row) => [playbackKey(row), row]));
  for (const [key, row] of beforeByKey) {
    if (afterByKey.has(key)) {
      continue;
    }
    await transaction
      .delete(schema.playbackLocalState)
      .where(
        and(
          eq(schema.playbackLocalState.accountIdText, row.accountIdText),
          eq(schema.playbackLocalState.queueIdText, row.queueIdText),
          eq(schema.playbackLocalState.resourceKind, row.resourceKind),
          eq(schema.playbackLocalState.resourceIdText, row.resourceIdText)
        )
      );
  }
  for (const [key, row] of afterByKey) {
    const previous = beforeByKey.get(key);
    if (
      previous !== undefined &&
      previous.completed === row.completed &&
      previous.lastMeaningfulAt === row.lastMeaningfulAt &&
      previous.mediaFileDuration === row.mediaFileDuration &&
      previous.playbackPosition === row.playbackPosition &&
      previous.zone === row.zone
    ) {
      continue;
    }
    if (previous !== undefined) {
      await transaction
        .update(schema.playbackLocalState)
        .set({
          completed: row.completed ? 1 : 0,
          lastMeaningfulAt: row.lastMeaningfulAt,
          mediaFileDuration: row.mediaFileDuration,
          playbackPosition: row.playbackPosition,
          zone: row.zone,
        })
        .where(
          and(
            eq(schema.playbackLocalState.accountIdText, row.accountIdText),
            eq(schema.playbackLocalState.queueIdText, row.queueIdText),
            eq(schema.playbackLocalState.resourceKind, row.resourceKind),
            eq(schema.playbackLocalState.resourceIdText, row.resourceIdText)
          )
        );
      continue;
    }
    await transaction.insert(schema.playbackLocalState).values({
      accountIdText: row.accountIdText,
      completed: row.completed ? 1 : 0,
      lastMeaningfulAt: row.lastMeaningfulAt,
      mediaFileDuration: row.mediaFileDuration,
      playbackPosition: row.playbackPosition,
      queueIdText: row.queueIdText,
      resourceIdText: row.resourceIdText,
      resourceKind: row.resourceKind,
      zone: row.zone,
    });
  }
};

const persistOutbox = async (
  transaction: PromotionTransaction,
  before: readonly PromotionOutbox[],
  after: readonly PromotionOutbox[]
): Promise<void> => {
  const afterById = new Map(after.map((row) => [row.id, row]));
  for (const row of before) {
    if (!afterById.has(row.id)) {
      await transaction.delete(schema.playbackOutbox).where(eq(schema.playbackOutbox.id, row.id));
    }
  }
  for (const row of after) {
    const previous = before.find((candidate) => candidate.id === row.id);
    if (previous === undefined) {
      continue;
    }
    if (
      previous.completed === row.completed &&
      previous.playbackPosition === row.playbackPosition &&
      previous.resourceIdText === row.resourceIdText &&
      previous.resourceKind === row.resourceKind
    ) {
      continue;
    }
    await transaction
      .update(schema.playbackOutbox)
      .set({
        completed: row.completed ? 1 : 0,
        playbackPosition: row.playbackPosition,
        resourceIdText: row.resourceIdText,
        resourceKind: row.resourceKind,
      })
      .where(eq(schema.playbackOutbox.id, row.id));
  }
};

const persistSeen = async (
  transaction: PromotionTransaction,
  before: AddByRssPromotionSnapshot['channelSeen'],
  after: AddByRssPromotionSnapshot['channelSeen']
): Promise<void> => {
  const afterByKey = new Map(after.map((row) => [row.key, row]));
  for (const row of before) {
    if (!afterByKey.has(row.key)) {
      await transaction
        .delete(schema.channelSeen)
        .where(eq(schema.channelSeen.subscriptionKey, row.key));
    }
  }
  for (const row of after) {
    const previous = before.find((candidate) => candidate.key === row.key);
    if (previous !== undefined && previous.at === row.at && previous.kind === row.kind) {
      continue;
    }
    await transaction
      .insert(schema.channelSeen)
      .values({
        kind: row.kind,
        lastSeenAt: row.at,
        subscriptionKey: row.key,
        updatedAt: row.at,
      })
      .onConflictDoUpdate({
        set: { kind: row.kind, lastSeenAt: row.at, updatedAt: row.at },
        target: schema.channelSeen.subscriptionKey,
      });
  }
};

const persistLive = async (
  transaction: PromotionTransaction,
  before: AddByRssPromotionSnapshot['channelLive'],
  after: AddByRssPromotionSnapshot['channelLive']
): Promise<void> => {
  const afterByKey = new Map(after.map((row) => [row.key, row]));
  for (const row of before) {
    if (!afterByKey.has(row.key)) {
      await transaction
        .delete(schema.channelLiveStatus)
        .where(eq(schema.channelLiveStatus.subscriptionKey, row.key));
    }
  }
  for (const row of after) {
    const previous = before.find((candidate) => candidate.key === row.key);
    if (
      previous !== undefined &&
      previous.at === row.at &&
      previous.kind === row.kind &&
      previous.statusId === row.statusId
    ) {
      continue;
    }
    await transaction
      .insert(schema.channelLiveStatus)
      .values({
        kind: row.kind,
        statusId: row.statusId,
        subscriptionKey: row.key,
        updatedAt: row.at,
      })
      .onConflictDoUpdate({
        set: { kind: row.kind, statusId: row.statusId, updatedAt: row.at },
        target: schema.channelLiveStatus.subscriptionKey,
      });
  }
};

const persistAutoChannels = async (
  transaction: PromotionTransaction,
  before: AddByRssPromotionSnapshot['autoDownloadChannels'],
  after: AddByRssPromotionSnapshot['autoDownloadChannels']
): Promise<void> => {
  const afterIds = new Set(after.map((row) => row.channelIdText));
  for (const row of before) {
    if (!afterIds.has(row.channelIdText)) {
      await transaction
        .delete(schema.channelAutoDownload)
        .where(eq(schema.channelAutoDownload.channelIdText, row.channelIdText));
    }
  }
  for (const row of after) {
    const previous = before.find((candidate) => candidate.channelIdText === row.channelIdText);
    if (
      previous !== undefined &&
      previous.allowCellular === row.allowCellular &&
      previous.enabled === row.enabled &&
      previous.enabledAt === row.enabledAt &&
      previous.source === row.source
    ) {
      continue;
    }
    const updatedAt = Date.now();
    await transaction
      .insert(schema.channelAutoDownload)
      .values({
        allowCellular: row.allowCellular,
        channelIdText: row.channelIdText,
        enabled: row.enabled,
        enabledAt: row.enabledAt,
        source: row.source,
        updatedAt,
      })
      .onConflictDoUpdate({
        set: {
          allowCellular: row.allowCellular,
          enabled: row.enabled,
          enabledAt: row.enabledAt,
          source: row.source,
          updatedAt,
        },
        target: schema.channelAutoDownload.channelIdText,
      });
  }
};

const persistAutoItems = async (
  transaction: PromotionTransaction,
  before: AddByRssPromotionSnapshot['autoDownloadCandidates'],
  after: AddByRssPromotionSnapshot['autoDownloadCandidates']
): Promise<void> => {
  const afterIds = new Set(after.map((row) => row.itemIdText));
  for (const row of before) {
    if (!afterIds.has(row.itemIdText)) {
      await transaction
        .delete(schema.autoDownloadCandidate)
        .where(eq(schema.autoDownloadCandidate.itemIdText, row.itemIdText));
    }
  }
  for (const row of after) {
    const previous = before.find((candidate) => candidate.itemIdText === row.itemIdText);
    if (
      previous !== undefined &&
      previous.channelIdText === row.channelIdText &&
      previous.status === row.status
    ) {
      continue;
    }
    const updatedAt = Date.now();
    await transaction
      .insert(schema.autoDownloadCandidate)
      .values({
        channelIdText: row.channelIdText,
        itemIdText: row.itemIdText,
        status: row.status,
        updatedAt,
      })
      .onConflictDoUpdate({
        set: { channelIdText: row.channelIdText, status: row.status, updatedAt },
        target: schema.autoDownloadCandidate.itemIdText,
      });
  }
};

const persistChrome = async (
  transaction: PromotionTransaction,
  before: AddByRssPromotionSnapshot['sectionChrome'],
  after: AddByRssPromotionSnapshot['sectionChrome']
): Promise<void> => {
  const afterKeys = new Set(after.map((row) => row.key));
  for (const row of before) {
    if (!afterKeys.has(row.key)) {
      await transaction
        .delete(schema.sectionChromeFlags)
        .where(eq(schema.sectionChromeFlags.cacheKey, row.key));
    }
  }
  for (const row of after) {
    const previous = before.find((candidate) => candidate.key === row.key);
    if (previous !== undefined && previous.flagsJson === row.flagsJson) {
      continue;
    }
    await transaction
      .insert(schema.sectionChromeFlags)
      .values({ cacheKey: row.key, flagsJson: row.flagsJson, updatedAt: row.updatedAt })
      .onConflictDoUpdate({
        set: { flagsJson: row.flagsJson, updatedAt: row.updatedAt },
        target: schema.sectionChromeFlags.cacheKey,
      });
  }
};

const persistPlayable = async (
  transaction: PromotionTransaction,
  before: AddByRssPromotionSnapshot['playableItems'],
  after: AddByRssPromotionSnapshot['playableItems']
): Promise<void> => {
  const keyOf = (row: AddByRssPromotionSnapshot['playableItems'][number]): string => {
    return `${row.itemIdText}\0${row.source}`;
  };
  const afterByKey = new Map(after.map((row) => [keyOf(row), row]));
  for (const row of before) {
    if (afterByKey.has(keyOf(row))) {
      continue;
    }
    await transaction
      .delete(schema.playableItem)
      .where(
        and(eq(schema.playableItem.itemIdText, row.itemIdText), eq(schema.playableItem.source, row.source))
      );
  }
  for (const row of after) {
    const previous = before.find(
      (candidate) => candidate.itemIdText === row.itemIdText && candidate.source === row.source
    );
    if (previous !== undefined && previous.payloadJson === row.payloadJson) {
      continue;
    }
    const updatedAt = Date.now();
    await transaction
      .insert(schema.playableItem)
      .values({
        itemIdText: row.itemIdText,
        payloadJson: row.payloadJson,
        source: row.source,
        updatedAt,
      })
      .onConflictDoUpdate({
        set: { payloadJson: row.payloadJson, updatedAt },
        target: [schema.playableItem.itemIdText, schema.playableItem.source],
      });
  }
};

const persistListed = async (
  transaction: PromotionTransaction,
  before: readonly PromotionListedFeed[],
  after: readonly PromotionListedFeed[]
): Promise<void> => {
  const afterByKey = new Map(after.map((row) => [listedKey(row), row]));
  for (const row of before) {
    if (afterByKey.has(listedKey(row))) {
      continue;
    }
    await transaction
      .delete(schema.addByRssListedFeed)
      .where(
        and(
          eq(schema.addByRssListedFeed.publisherFeedUrl, row.publisherFeedUrl),
          eq(schema.addByRssListedFeed.feedGuid, row.feedGuid)
        )
      );
  }
  for (const row of after) {
    const previous = before.find((candidate) => listedKey(candidate) === listedKey(row));
    if (previous !== undefined && JSON.stringify(previous) === JSON.stringify(row)) {
      continue;
    }
    await transaction
      .update(schema.addByRssListedFeed)
      .set({
        channelIdText: row.channelIdText,
        channelTitle: row.channelTitle,
        feedUrl: row.feedUrl,
        kind: row.kind,
        mediumId: row.mediumId,
        pendingRequestId: row.pendingRequestId,
        unresolvedReason: row.unresolvedReason,
      })
      .where(
        and(
          eq(schema.addByRssListedFeed.publisherFeedUrl, row.publisherFeedUrl),
          eq(schema.addByRssListedFeed.feedGuid, row.feedGuid)
        )
      );
  }
};

const refreshMovedPlayables = async (
  moved: readonly { fromItemIdText: string; toItemIdText: string }[]
): Promise<void> => {
  for (const move of moved) {
    try {
      const item = await requestWithoutMobileAuth((api) =>
        api.reqItemGetByIdOrIdText(move.toItemIdText)
      );
      await playableItemRepository.put('download', item);
    } catch {
      await playableItemRepository.remove('download', move.fromItemIdText);
      await playableItemRepository.remove('download', move.toItemIdText);
    }
  }
};

const projectPromotion = async (feedUrl: string, channelIdText: string): Promise<void> => {
  await reprojectLibraryIndex();
  await reprojectLibraryChildrenForChannel(feedUrl);
  await reprojectLibraryChildrenForChannel(channelIdText);
  await downloadsRepository.reprojectNativeCache();
  homeFeedRefresh.notify();
};

const appendPromoted = async (
  channelIdText: string,
  channelTitle: string | null,
  movedItems: number
): Promise<void> => {
  await syncEventLogRepository.append({
    details: { moved_items: String(movedItems) },
    errorCode: ADD_BY_RSS_PROMOTED_CODE,
    jobKind: 'add-by-rss-refresh',
    message: formatDirectoryChannelGoneDetail(channelIdText, channelTitle),
    occurredAt: Date.now(),
    outcome: 'reconciled',
  });
};

export const addByRssPromotion = {
  /**
   * Public directory matches, keyed by the feed URL that was asked.
   * `context` is unused: the match route does not take a bearer token.
   */
  findMatches: async (
    _context: MobileAuthRequestContext,
    feeds: readonly AddByRssMatchFeedInput[]
  ): Promise<Map<string, DTOAddByRSSMatchFeed>> => {
    const matches = new Map<string, DTOAddByRSSMatchFeed>();
    for (const chunk of buildAddByRssMatchRefs(feeds)) {
      const response = await requestWithoutMobileAuth((api) =>
        api.reqChannelAddByRSSMatch({ feeds: chunk })
      );
      for (const match of response.matches) {
        if (match.channel !== null) {
          matches.set(match.feed_url, match);
        }
      }
    }
    return matches;
  },

  /** Followed signed-out feeds, ready for `findMatches`. Password-protected feeds are included so the chunker can drop them. */
  signedOutMatchFeeds: async (): Promise<AddByRssMatchFeedInput[]> => {
    const followed = await addByRssRepository.listSignedOutFollowedFeeds();
    const feeds: AddByRssMatchFeedInput[] = [];
    for (const feed of followed) {
      const built = await matchFeedForUrl(feed.feedUrl, feed.requiresCredentials);
      if (built !== null) {
        feeds.push(built);
      }
    }
    return feeds;
  },

  /**
   * Followed feeds this signed-in session shows, ready for `findMatches`.
   * Password-protected feeds are left out: they never match a directory channel.
   */
  accountMatchFeeds: async (): Promise<AddByRssMatchFeedInput[]> => {
    const followed = await addByRssRepository.listFeeds();
    const feeds: AddByRssMatchFeedInput[] = [];
    for (const feed of followed) {
      if (feed.requiresCredentials === true) {
        continue;
      }
      const built = await matchFeedForUrl(feed.feedUrl, false);
      if (built !== null) {
        feeds.push(built);
      }
    }
    return feeds;
  },

  /**
   * Ask the account to convert one follow, then move this phone's rows onto the directory channel.
   *
   * `not_followed` with a channel means another device already converted it. The item map then
   * comes from a match of this phone's stored episodes. No match, or a feed that needs a
   * username and password, leaves the local rows as they are.
   */
  convertAccountFeed: async (params: {
    context: MobileAuthRequestContext;
    feedUrl: string;
    feedGuid: string | null;
  }): Promise<{ channelIdText: string } | null> => {
    const response = await requestWithMobileAuthRefresh(params.context, (api) =>
      api.reqAccountAddByRSSConvertToChannel({
        feed_guid: params.feedGuid,
        feed_url: params.feedUrl,
      })
    );
    if (response.converted) {
      const match = await matchFromConvertedItems(
        params.feedUrl,
        response.channel,
        response.items
      );
      return addByRssPromotion.promoteLocally({
        accountSync: true,
        context: params.context,
        feedUrl: params.feedUrl,
        match,
      });
    }
    if (response.reason === 'not_followed' && response.channel !== null) {
      return addByRssPromotion.promoteFollowedDirectoryChannel({
        channel: response.channel,
        context: params.context,
        feedUrl: params.feedUrl,
      });
    }
    return null;
  },

  /**
   * Move this phone's rows for a feed the account just followed as a directory channel.
   * Null when the match does not return that channel, so a missing item map does not drop downloads.
   */
  promoteFollowedDirectoryChannel: async (params: {
    channel: DTOChannelDirectoryMatch;
    context: MobileAuthRequestContext;
    feedUrl: string;
  }): Promise<{ channelIdText: string } | null> => {
    const built = await matchFeedForUrl(params.feedUrl, false);
    const feeds: AddByRssMatchFeedInput[] =
      built === null ? [{ feedUrl: params.feedUrl, items: [], podcastGuid: null }] : [built];
    const matches = await addByRssPromotion.findMatches(params.context, feeds);
    const match = matches.get(params.feedUrl);
    if (match === undefined || match.channel?.id_text !== params.channel.id_text) {
      return null;
    }
    return addByRssPromotion.promoteLocally({
      accountSync: true,
      context: params.context,
      feedUrl: params.feedUrl,
      match,
    });
  },

  /** The directory channel as a local subscription. Null when it has no title. */
  subscribeDirectoryChannel: async (channelIdText: string): Promise<SubscribedChannel | null> => {
    const channel = await requestWithoutMobileAuth((api) =>
      api.reqChannelGetByIdOrIdText(channelIdText)
    );
    const entry = mapDirectoryChannelToSubscribed(channel);
    if (entry === null) {
      return null;
    }
    await subscriptionsRepository.subscribeLocal(entry);
    return entry;
  },

  /**
   * Subscribe, rewrite local rows, and remove the Add by RSS feed.
   *
   * `accountSync` is the signed-in move. The account already follows the directory channel, so
   * this does not call the account follow route. It drops the cached queue and the playlists
   * the account owns; those payloads still name Add by RSS rows the server has already moved.
   */
  promoteLocally: async (params: {
    accountSync: boolean;
    context: MobileAuthRequestContext;
    feedUrl: string;
    match: DTOAddByRSSMatchFeed;
  }): Promise<{ channelIdText: string }> => {
    void params.context;
    const channel = params.match.channel;
    if (channel === null) {
      throw new Error('Directory match has no channel');
    }
    const entry = await addByRssPromotion.subscribeDirectoryChannel(channel.id_text);
    if (entry === null) {
      throw new Error('Directory channel has no title');
    }
    const before = await loadSnapshot(params.feedUrl);
    const move = await moveForMatch(params.feedUrl, params.match);
    const result = addByRssPromotionRemap(before, move);
    const fullDownloads = await getDb().select().from(schema.download);
    const fullById = new Map(fullDownloads.map((row) => [row.itemIdText, row]));
    await getDb().transaction(async (transaction) => {
      await persistDownloads(
        transaction,
        before,
        result.snapshot,
        result.movedDownloadItemIds,
        fullById
      );
      await persistPlayback(transaction, before.playback, result.snapshot.playback);
      await persistOutbox(transaction, before.playbackOutbox, result.snapshot.playbackOutbox);
      await persistSeen(transaction, before.channelSeen, result.snapshot.channelSeen);
      await persistLive(transaction, before.channelLive, result.snapshot.channelLive);
      await persistAutoChannels(
        transaction,
        before.autoDownloadChannels,
        result.snapshot.autoDownloadChannels
      );
      await persistAutoItems(
        transaction,
        before.autoDownloadCandidates,
        result.snapshot.autoDownloadCandidates
      );
      await persistChrome(transaction, before.sectionChrome, result.snapshot.sectionChrome);
      await persistPlayable(transaction, before.playableItems, result.snapshot.playableItems);
      await persistListed(transaction, before.listedFeeds, result.snapshot.listedFeeds);
    });
    for (const filePath of result.downloadFilesToDelete) {
      await downloadsRepository.deleteStoredFile(filePath);
    }
    if (result.movedDownloadItemIds.length > 0 || result.downloadFilesToDelete.length > 0) {
      downloadStore.hydrate(await downloadsRepository.list());
    }
    await refreshMovedPlayables(result.movedDownloadItemIds);
    const feed = await addByRssRepository.getFeedByUrl(params.feedUrl);
    if (feed !== null) {
      await addByRssRepository.removeFeed(params.feedUrl);
      await appendPromoted(entry.idText, entry.title, move.items.length);
      await projectPromotion(params.feedUrl, entry.idText);
    }
    if (params.accountSync) {
      await queueRepository.clearAll();
      await playlistRepository.clearOwned();
    }
    return { channelIdText: entry.idText };
  },

  /** The same error-log row the refresh writes, for an add that had nothing local to move. */
  recordPromotion: async (
    channel: DTOChannelDirectoryMatch,
    movedItems: number
  ): Promise<void> => {
    await appendPromoted(channel.id_text, channel.title, movedItems);
    homeFeedRefresh.notify();
  },
};

/** True when a match request was answered, including a 4xx. Transport failures are not. */
export const directoryMatchRequestAnswered = (error: unknown): boolean => {
  const status = getErrorResponseStatus(error);
  return status !== undefined && status >= 400 && status < 500;
};
