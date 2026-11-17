import AsyncStorage from '@react-native-async-storage/async-storage';
import { eq, inArray } from 'drizzle-orm';

import type { SortPrefScope } from '@podverse/helpers';
import { buildSortPrefScopeKey } from '@podverse/helpers';
import type { IdentityResolveRequest } from '@podverse/helpers-requests';

import { createMobileApiRequestService } from '../../auth/mobileApi';
import {
  CHANNEL_ACTION_CHROME_KEY,
  hydrateChannelActionChrome,
  parsePersistedChannelActionChrome,
} from '../../lib/channelActionChrome';
import {
  readLastPlaybackSnapshot,
  writeLastPlaybackSnapshot,
} from '../../lib/playback/lastPlaybackStorage';
import { readSortPref, writeSortPref } from '../../prefs/sortPrefs';
import { getDb, initializeDatabase, schema } from '../db';
import type {
  IdentityChrome,
  IdentityIdMove,
  IdentityRemapMoves,
  IdentityRemapSnapshot,
  IdentitySortKey,
} from '../identityRemap';
import {
  collectIdTexts,
  directoryIdentityIds,
  IDENTITY_RESOLVE_CHUNK_SIZE,
  remapIdentity,
} from '../identityRemap';
import {
  reprojectLibraryChildrenForChannel,
  reprojectLibraryIndex,
} from '../nativeCache/carCacheReproject';
import { isWatermarkStale, writeSyncWatermark } from '../sync/syncMetadata';
import { downloadsRepository } from './downloadsRepository';
import { subscriptionsRepository } from './subscriptionsRepository';

const IDENTITY_REMAP_CHECKED_AT_KEY = 'identity_remap_checked_at';
const IDENTITY_REMAP_TTL_MS = 24 * 60 * 60 * 1000;
const SORT_STORAGE_PREFIX = 'sort.';

const chunk = <T>(values: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const uniqueIds = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (value.length === 0 || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
};

const readJsonIdTexts = (json: string, into: Set<string>): void => {
  try {
    collectIdTexts(JSON.parse(json), into);
  } catch {
    // A payload that is not JSON has no id to resolve.
  }
};

const loadSnapshot = async (): Promise<IdentityRemapSnapshot> => {
  await initializeDatabase();
  const db = getDb();
  const [
    appliedRows,
    subscribedRows,
    downloadRows,
    playbackRows,
    outboxRows,
    seenRows,
    liveRows,
    sectionRows,
    autoDownloadRows,
    autoDownloadItemRows,
    channelItemRows,
    playlistRows,
    playlistResourceRows,
    playableRows,
    chromeRows,
    queueRows,
  ] = await Promise.all([
    db.select().from(schema.identityRemapApplied),
    db.select().from(schema.subscribedChannel),
    db.select().from(schema.download),
    db.select().from(schema.playbackLocalState),
    db.select().from(schema.playbackOutbox),
    db.select().from(schema.channelSeen),
    db.select().from(schema.channelLiveStatus),
    db.select().from(schema.sectionChromeFlags),
    db.select().from(schema.channelAutoDownload),
    db.select().from(schema.autoDownloadCandidate),
    db.select({ channelIdText: schema.channelItem.channelIdText }).from(schema.channelItem),
    db
      .select({ idText: schema.playlist.idText, payloadJson: schema.playlist.payloadJson })
      .from(schema.playlist),
    db
      .select({ id: schema.playlistResource.id, payloadJson: schema.playlistResource.payloadJson })
      .from(schema.playlistResource),
    db.select().from(schema.playableItem),
    db
      .select({ value: schema.kvMeta.value })
      .from(schema.kvMeta)
      .where(eq(schema.kvMeta.key, CHANNEL_ACTION_CHROME_KEY))
      .limit(1),
    db.select({ cacheKey: schema.queueCache.cacheKey }).from(schema.queueCache).limit(1),
  ]);

  const sortKeys = await readSortKeys();
  const lastPlayback = await readLastPlaybackSnapshot();
  const chromeRecord = parsePersistedChannelActionChrome(
    chromeRows[0]?.value === undefined || chromeRows[0].value === null
      ? null
      : parseChromeJson(chromeRows[0].value)
  );
  const chrome: IdentityChrome[] = Object.entries(chromeRecord).map(([idText, entry]) => ({
    channelId: entry.channelId,
    idText,
    notificationsEnabled: entry.notificationsEnabled,
  }));

  const channelItemChannelIds = uniqueIds(channelItemRows.map((row) => row.channelIdText));

  return {
    applied: appliedRows.map((row) => ({ fromIdText: row.fromIdText, toIdText: row.toIdText })),
    autoDownloadChannels: autoDownloadRows.map((row) => ({
      allowCellular: row.allowCellular,
      channelIdText: row.channelIdText,
      enabled: row.enabled,
      enabledAt: row.enabledAt,
      source: row.source,
    })),
    autoDownloadItems: autoDownloadItemRows.map((row) => ({
      channelIdText: row.channelIdText,
      itemIdText: row.itemIdText,
      status: row.status,
    })),
    channelItemChannelIds,
    channelLive: liveRows.map((row) => ({
      at: row.updatedAt,
      key: row.subscriptionKey,
      kind: row.kind,
      statusId: row.statusId,
    })),
    channelSeen: seenRows.map((row) => ({
      at: row.lastSeenAt,
      key: row.subscriptionKey,
      kind: row.kind,
    })),
    chrome,
    downloads: downloadRows.map((row) => ({
      channelIdText: row.channelIdText,
      filePath: row.filePath,
      itemIdText: row.itemIdText,
    })),
    lastPlaybackIdText: lastPlayback?.id_text ?? null,
    playableItems: playableRows.map((row) => ({
      itemIdText: row.itemIdText,
      payloadJson: row.payloadJson,
      source: row.source,
    })),
    playback: playbackRows.map((row) => ({
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
    playbackOutbox: outboxRows.map((row) => ({
      completed: row.completed === 1,
      id: row.id,
      playbackPosition: row.playbackPosition ?? 0,
      resourceIdText: row.resourceIdText,
    })),
    playlistPayloads: playlistRows.map((row) => ({ id: row.idText, json: row.payloadJson })),
    playlistResourcePayloads: playlistResourceRows.map((row) => ({
      id: String(row.id),
      json: row.payloadJson,
    })),
    queueCachePresent: queueRows.length > 0,
    sectionChrome: sectionRows.map((row) => ({
      flagsJson: row.flagsJson,
      key: row.cacheKey,
      updatedAt: row.updatedAt,
    })),
    sortKeys,
    subscribedChannels: subscribedRows.map((row) => ({
      idText: row.idText,
      imageUrl: row.imageUrl,
      kind: row.kind,
      medium: row.medium,
      popularityRank: row.popularityRank,
      source: row.source,
      title: row.title,
    })),
  };
};

const parseChromeJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const readSortKeys = async (): Promise<IdentitySortKey[]> => {
  const keys = await AsyncStorage.getAllKeys();
  const sortKeys: IdentitySortKey[] = [];
  for (const storageKey of keys) {
    if (!storageKey.startsWith(SORT_STORAGE_PREFIX)) {
      continue;
    }
    const scopeKey = storageKey.slice(SORT_STORAGE_PREFIX.length);
    if (scopeKey.startsWith('channel:')) {
      sortKeys.push({ idText: scopeKey.slice('channel:'.length), scopeKind: 'channel' });
    } else if (scopeKey.startsWith('item:')) {
      sortKeys.push({ idText: scopeKey.slice('item:'.length), scopeKind: 'item' });
    }
  }
  return sortKeys;
};

const persistSnapshot = async (
  before: IdentityRemapSnapshot,
  after: IdentityRemapSnapshot
): Promise<void> => {
  const db = getDb();
  await db.transaction(async (tx) => {
    const beforeSubscribed = new Set(before.subscribedChannels.map((row) => row.idText));
    const afterSubscribed = new Set(after.subscribedChannels.map((row) => row.idText));
    for (const channel of after.subscribedChannels) {
      if (beforeSubscribed.has(channel.idText)) {
        continue;
      }
      await tx.insert(schema.subscribedChannel).values({
        idText: channel.idText,
        imageUrl: channel.imageUrl,
        kind: channel.kind,
        medium: channel.medium,
        popularityRank: channel.popularityRank,
        source: channel.source,
        title: channel.title,
        updatedAt: Date.now(),
      });
    }
    for (const idText of beforeSubscribed) {
      if (afterSubscribed.has(idText)) {
        continue;
      }
      await tx.delete(schema.subscribedChannel).where(eq(schema.subscribedChannel.idText, idText));
    }

    const downloadRows = await tx.select().from(schema.download);
    const removedDownloadIds = before.downloads
      .filter((row) => !after.downloads.some((next) => next.itemIdText === row.itemIdText))
      .map((row) => row.itemIdText);
    for (const desired of after.downloads) {
      const same = downloadRows.find((row) => row.itemIdText === desired.itemIdText);
      if (same !== undefined) {
        if ((same.channelIdText ?? null) !== desired.channelIdText) {
          await tx
            .update(schema.download)
            .set({ channelIdText: desired.channelIdText, updatedAt: Date.now() })
            .where(eq(schema.download.itemIdText, desired.itemIdText));
        }
        continue;
      }
      const source = downloadRows.find(
        (row) => row.filePath === desired.filePath && removedDownloadIds.includes(row.itemIdText)
      );
      if (source === undefined) {
        continue;
      }
      await tx.insert(schema.download).values({
        ...source,
        channelIdText: desired.channelIdText,
        filePath: source.filePath,
        itemIdText: desired.itemIdText,
        updatedAt: Date.now(),
      });
    }
    if (removedDownloadIds.length > 0) {
      await tx
        .delete(schema.download)
        .where(inArray(schema.download.itemIdText, removedDownloadIds));
    }

    await tx.delete(schema.playbackLocalState);
    if (after.playback.length > 0) {
      await tx.insert(schema.playbackLocalState).values(
        after.playback.map((row) => ({
          accountIdText: row.accountIdText,
          completed: row.completed ? 1 : 0,
          lastMeaningfulAt: row.lastMeaningfulAt,
          mediaFileDuration: row.mediaFileDuration,
          playbackPosition: row.playbackPosition,
          queueIdText: row.queueIdText,
          resourceIdText: row.resourceIdText,
          resourceKind: row.resourceKind,
          zone: row.zone,
        }))
      );
    }

    const keptOutboxIds = new Set(after.playbackOutbox.map((row) => row.id));
    for (const row of after.playbackOutbox) {
      const previous = before.playbackOutbox.find((item) => item.id === row.id);
      if (
        previous !== undefined &&
        previous.resourceIdText === row.resourceIdText &&
        previous.playbackPosition === row.playbackPosition &&
        previous.completed === row.completed
      ) {
        continue;
      }
      await tx
        .update(schema.playbackOutbox)
        .set({
          completed: row.completed ? 1 : 0,
          playbackPosition: row.playbackPosition,
          resourceIdText: row.resourceIdText,
        })
        .where(eq(schema.playbackOutbox.id, row.id));
    }
    const removedOutboxIds = before.playbackOutbox
      .filter((row) => !keptOutboxIds.has(row.id))
      .map((row) => row.id);
    if (removedOutboxIds.length > 0) {
      await tx
        .delete(schema.playbackOutbox)
        .where(inArray(schema.playbackOutbox.id, removedOutboxIds));
    }

    await tx.delete(schema.channelSeen);
    if (after.channelSeen.length > 0) {
      await tx.insert(schema.channelSeen).values(
        after.channelSeen.map((row) => ({
          kind: row.kind,
          lastSeenAt: row.at,
          subscriptionKey: row.key,
          updatedAt: Date.now(),
        }))
      );
    }

    await tx.delete(schema.channelLiveStatus);
    if (after.channelLive.length > 0) {
      await tx.insert(schema.channelLiveStatus).values(
        after.channelLive.map((row) => ({
          kind: row.kind,
          statusId: row.statusId,
          subscriptionKey: row.key,
          updatedAt: row.at,
        }))
      );
    }

    await tx.delete(schema.sectionChromeFlags);
    if (after.sectionChrome.length > 0) {
      await tx.insert(schema.sectionChromeFlags).values(
        after.sectionChrome.map((row) => ({
          cacheKey: row.key,
          flagsJson: row.flagsJson,
          updatedAt: row.updatedAt,
        }))
      );
    }

    await tx.delete(schema.channelAutoDownload);
    if (after.autoDownloadChannels.length > 0) {
      await tx.insert(schema.channelAutoDownload).values(
        after.autoDownloadChannels.map((row) => ({
          allowCellular: row.allowCellular,
          channelIdText: row.channelIdText,
          enabled: row.enabled,
          enabledAt: row.enabledAt,
          source: row.source,
          updatedAt: Date.now(),
        }))
      );
    }

    await tx.delete(schema.autoDownloadCandidate);
    if (after.autoDownloadItems.length > 0) {
      await tx.insert(schema.autoDownloadCandidate).values(
        after.autoDownloadItems.map((row) => ({
          channelIdText: row.channelIdText,
          itemIdText: row.itemIdText,
          status: row.status,
          updatedAt: Date.now(),
        }))
      );
    }

    await tx.delete(schema.playableItem);
    if (after.playableItems.length > 0) {
      await tx.insert(schema.playableItem).values(
        after.playableItems.map((row) => ({
          itemIdText: row.itemIdText,
          payloadJson: row.payloadJson,
          source: row.source,
          updatedAt: Date.now(),
        }))
      );
    }

    for (const row of after.playlistPayloads) {
      const previous = before.playlistPayloads.find((item) => item.id === row.id);
      if (previous === undefined || previous.json === row.json) {
        continue;
      }
      await tx
        .update(schema.playlist)
        .set({ payloadJson: row.json, updatedAt: Date.now() })
        .where(eq(schema.playlist.idText, row.id));
    }
    for (const row of after.playlistResourcePayloads) {
      const previous = before.playlistResourcePayloads.find((item) => item.id === row.id);
      if (previous === undefined || previous.json === row.json) {
        continue;
      }
      const id = Number(row.id);
      if (!Number.isInteger(id)) {
        continue;
      }
      await tx
        .update(schema.playlistResource)
        .set({ payloadJson: row.json, updatedAt: Date.now() })
        .where(eq(schema.playlistResource.id, id));
    }

    const removedChannels = before.channelItemChannelIds.filter(
      (idText) => !after.channelItemChannelIds.includes(idText)
    );
    if (removedChannels.length > 0) {
      await tx
        .delete(schema.channelItem)
        .where(inArray(schema.channelItem.channelIdText, removedChannels));
      await tx
        .delete(schema.channelItemWindow)
        .where(inArray(schema.channelItemWindow.channelIdText, removedChannels));
    }

    if (!after.queueCachePresent) {
      await tx.delete(schema.queueCache);
    }

    for (const move of after.applied) {
      const previous = before.applied.find(
        (row) => row.fromIdText === move.fromIdText && row.toIdText === move.toIdText
      );
      if (previous !== undefined) {
        continue;
      }
      await tx
        .insert(schema.identityRemapApplied)
        .values({ appliedAt: Date.now(), fromIdText: move.fromIdText, toIdText: move.toIdText })
        .onConflictDoUpdate({
          target: schema.identityRemapApplied.fromIdText,
          set: { appliedAt: Date.now(), toIdText: move.toIdText },
        });

      // Cached show notes follow the item, so a downloaded item keeps its pinned notes.
      const notesRow = await tx
        .select({ itemIdText: schema.itemDescriptionCache.itemIdText })
        .from(schema.itemDescriptionCache)
        .where(eq(schema.itemDescriptionCache.itemIdText, move.fromIdText))
        .limit(1);
      if (notesRow.length > 0) {
        await tx
          .delete(schema.itemDescriptionCache)
          .where(eq(schema.itemDescriptionCache.itemIdText, move.toIdText));
        await tx
          .update(schema.itemDescriptionCache)
          .set({ itemIdText: move.toIdText })
          .where(eq(schema.itemDescriptionCache.itemIdText, move.fromIdText));
      }
    }

    const chrome: Record<
      string,
      { channelId: number | null; notificationsEnabled: boolean | null }
    > = {};
    for (const row of after.chrome) {
      chrome[row.idText] = {
        channelId: row.channelId,
        notificationsEnabled: row.notificationsEnabled,
      };
    }
    await tx
      .insert(schema.kvMeta)
      .values({
        key: CHANNEL_ACTION_CHROME_KEY,
        updatedAt: Date.now(),
        value: JSON.stringify(chrome),
      })
      .onConflictDoUpdate({
        target: schema.kvMeta.key,
        set: { updatedAt: Date.now(), value: JSON.stringify(chrome) },
      });
  });
};

const sortScope = (key: IdentitySortKey): SortPrefScope => {
  if (key.scopeKind === 'channel') {
    return { idText: key.idText, kind: 'channel' };
  }
  return { idText: key.idText, kind: 'item' };
};

const persistDeviceKeys = async (
  before: IdentityRemapSnapshot,
  after: IdentityRemapSnapshot
): Promise<void> => {
  const removedSortKeys = before.sortKeys.filter(
    (row) =>
      !after.sortKeys.some((next) => next.scopeKind === row.scopeKind && next.idText === row.idText)
  );
  for (const key of after.sortKeys) {
    const already = before.sortKeys.some(
      (row) => row.scopeKind === key.scopeKind && row.idText === key.idText
    );
    if (already) {
      continue;
    }
    const sourceIndex = removedSortKeys.findIndex((row) => row.scopeKind === key.scopeKind);
    const source = sourceIndex === -1 ? undefined : removedSortKeys[sourceIndex];
    if (source === undefined) {
      continue;
    }
    removedSortKeys.splice(sourceIndex, 1);
    const value = await readSortPref(sortScope(source));
    if (value !== null) {
      await writeSortPref(sortScope(key), value);
    }
  }
  for (const key of before.sortKeys) {
    const still = after.sortKeys.some(
      (row) => row.scopeKind === key.scopeKind && row.idText === key.idText
    );
    if (still) {
      continue;
    }
    const scopeKey = buildSortPrefScopeKey(sortScope(key));
    if (scopeKey === null) {
      continue;
    }
    await AsyncStorage.removeItem(`${SORT_STORAGE_PREFIX}${scopeKey}`);
  }

  if (
    before.lastPlaybackIdText !== null &&
    after.lastPlaybackIdText !== null &&
    before.lastPlaybackIdText !== after.lastPlaybackIdText
  ) {
    const stored = await readLastPlaybackSnapshot();
    if (stored !== null && stored.id_text === before.lastPlaybackIdText) {
      await writeLastPlaybackSnapshot({ ...stored, id_text: after.lastPlaybackIdText });
    }
  }

  const subscribed = await subscriptionsRepository.list();
  const chromeRows = await getDb()
    .select({ value: schema.kvMeta.value })
    .from(schema.kvMeta)
    .where(eq(schema.kvMeta.key, CHANNEL_ACTION_CHROME_KEY))
    .limit(1);
  hydrateChannelActionChrome({
    persisted: parsePersistedChannelActionChrome(parseChromeJson(chromeRows[0]?.value ?? 'null')),
    subscribedIdTexts: subscribed.map((channel) => channel.idText),
  });
};

const projectCaches = async (moves: IdentityRemapMoves): Promise<void> => {
  await reprojectLibraryIndex();
  const channelIds = new Set<string>();
  for (const move of moves.channels) {
    channelIds.add(move.fromIdText);
    channelIds.add(move.toIdText);
  }
  for (const channelIdText of channelIds) {
    await reprojectLibraryChildrenForChannel(channelIdText);
  }
  await downloadsRepository.reprojectNativeCache();
};

const applyMoves = async (
  moves: IdentityRemapMoves
): Promise<{ moved: boolean; channelMoves: readonly IdentityIdMove[] }> => {
  const before = await loadSnapshot();
  const result = remapIdentity(before, moves);
  const moved = result.newMoves.channels.length > 0 || result.newMoves.items.length > 0;
  if (!moved) {
    return { channelMoves: [], moved: false };
  }
  await persistSnapshot(before, result.snapshot);
  await persistDeviceKeys(before, result.snapshot);
  await projectCaches(result.newMoves);
  return { channelMoves: result.newMoves.channels, moved: true };
};

const resolveMoves = async (
  channelIdTexts: readonly string[],
  itemIdTexts: readonly string[]
): Promise<IdentityRemapMoves> => {
  const channels = directoryIdentityIds(channelIdTexts);
  const items = directoryIdentityIds(itemIdTexts);
  if (channels.length === 0 && items.length === 0) {
    return { channels: [], items: [] };
  }

  const api = createMobileApiRequestService();
  if (api === null) {
    throw new Error('Mobile API is not configured');
  }

  const channelChunks = chunk(channels, IDENTITY_RESOLVE_CHUNK_SIZE);
  const itemChunks = chunk(items, IDENTITY_RESOLVE_CHUNK_SIZE);
  const rounds = Math.max(channelChunks.length, itemChunks.length);
  const channelMoves: IdentityIdMove[] = [];
  const itemMoves: IdentityIdMove[] = [];

  for (let index = 0; index < rounds; index += 1) {
    const channelChunk = channelChunks[index] ?? [];
    const itemChunk = itemChunks[index] ?? [];
    const body: IdentityResolveRequest = {};
    if (channelChunk.length > 0) {
      body.channel_id_texts = channelChunk;
    }
    if (itemChunk.length > 0) {
      body.item_id_texts = itemChunk;
    }
    if (body.channel_id_texts === undefined && body.item_id_texts === undefined) {
      continue;
    }
    const response = await api.reqIdentityResolve(body);
    const resolvedChannels = Array.isArray(response.channels) ? response.channels : [];
    const resolvedItems = Array.isArray(response.items) ? response.items : [];
    for (const move of resolvedChannels) {
      if (move.from_id_text.length === 0 || move.to_id_text.length === 0) {
        continue;
      }
      channelMoves.push({ fromIdText: move.from_id_text, toIdText: move.to_id_text });
    }
    for (const move of resolvedItems) {
      if (move.from_id_text.length === 0 || move.to_id_text.length === 0) {
        continue;
      }
      itemMoves.push({ fromIdText: move.from_id_text, toIdText: move.to_id_text });
    }
  }

  return { channels: channelMoves, items: itemMoves };
};

const collectLibraryIds = async (): Promise<{ channels: string[]; items: string[] }> => {
  await initializeDatabase();
  const db = getDb();
  const [subscribed, downloads, playback, outbox, playlists, playlistResources] = await Promise.all(
    [
      db.select({ idText: schema.subscribedChannel.idText }).from(schema.subscribedChannel),
      db.select({ itemIdText: schema.download.itemIdText }).from(schema.download),
      db
        .select({ resourceIdText: schema.playbackLocalState.resourceIdText })
        .from(schema.playbackLocalState),
      db
        .select({ resourceIdText: schema.playbackOutbox.resourceIdText })
        .from(schema.playbackOutbox),
      db.select({ payloadJson: schema.playlist.payloadJson }).from(schema.playlist),
      db.select({ payloadJson: schema.playlistResource.payloadJson }).from(schema.playlistResource),
    ]
  );

  const itemIds = new Set<string>();
  for (const row of downloads) {
    itemIds.add(row.itemIdText);
  }
  for (const row of playback) {
    itemIds.add(row.resourceIdText);
  }
  for (const row of outbox) {
    itemIds.add(row.resourceIdText);
  }
  for (const row of playlists) {
    readJsonIdTexts(row.payloadJson, itemIds);
  }
  for (const row of playlistResources) {
    readJsonIdTexts(row.payloadJson, itemIds);
  }

  return {
    channels: uniqueIds(subscribed.map((row) => row.idText)),
    items: uniqueIds([...itemIds]),
  };
};

const collectChannelItemIds = async (channelIdText: string): Promise<string[]> => {
  await initializeDatabase();
  const db = getDb();
  const [items, downloads, autoDownloadItems, playback, outbox] = await Promise.all([
    db
      .select({ itemIdText: schema.channelItem.itemIdText })
      .from(schema.channelItem)
      .where(eq(schema.channelItem.channelIdText, channelIdText)),
    db
      .select({ itemIdText: schema.download.itemIdText })
      .from(schema.download)
      .where(eq(schema.download.channelIdText, channelIdText)),
    db
      .select({ itemIdText: schema.autoDownloadCandidate.itemIdText })
      .from(schema.autoDownloadCandidate)
      .where(eq(schema.autoDownloadCandidate.channelIdText, channelIdText)),
    db
      .select({ resourceIdText: schema.playbackLocalState.resourceIdText })
      .from(schema.playbackLocalState),
    db.select({ resourceIdText: schema.playbackOutbox.resourceIdText }).from(schema.playbackOutbox),
  ]);
  return uniqueIds([
    ...items.map((row) => row.itemIdText),
    ...downloads.map((row) => row.itemIdText),
    ...autoDownloadItems.map((row) => row.itemIdText),
    ...playback.map((row) => row.resourceIdText),
    ...outbox.map((row) => row.resourceIdText),
  ]);
};

export const identityRemapRepository = {
  /**
   * Resolve every local channel and item id. A pass that finds nothing still stamps the watermark
   * so a quiet library does not ask again until the day has passed. A caller that ignores the
   * watermark is someone asking now.
   */
  runScheduled: async (params: { ignoreWatermark: boolean }): Promise<{ moved: boolean }> => {
    if (
      !params.ignoreWatermark &&
      !(await isWatermarkStale(IDENTITY_REMAP_CHECKED_AT_KEY, IDENTITY_REMAP_TTL_MS))
    ) {
      return { moved: false };
    }

    const ids = await collectLibraryIds();
    if (ids.channels.length === 0 && ids.items.length === 0) {
      await writeSyncWatermark(IDENTITY_REMAP_CHECKED_AT_KEY, Date.now());
      return { moved: false };
    }

    const moves = await resolveMoves(ids.channels, ids.items);
    const result = await applyMoves(moves);
    await writeSyncWatermark(IDENTITY_REMAP_CHECKED_AT_KEY, Date.now());
    return { moved: result.moved };
  },

  /** Resolve one channel, and the item ids stored against it, before a follow is dropped. */
  remapChannel: async (channelIdText: string): Promise<string | null> => {
    const itemIdTexts = await collectChannelItemIds(channelIdText);
    const moves = await resolveMoves([channelIdText], itemIdTexts);
    const result = await applyMoves(moves);
    return result.channelMoves.find((move) => move.fromIdText === channelIdText)?.toIdText ?? null;
  },
};
