/**
 * Pure rewrite of local identity keys after a show or episode moves.
 *
 * The stored download path is the file playback opens. This module never changes that path.
 * These move maps are directory id texts. Add-by-RSS feed URLs and episode hashes are not in
 * them; the Add by RSS promotion remap rewrites those rows.
 */

export const IDENTITY_RESOLVE_CHUNK_SIZE = 500;

export type IdentityIdMove = {
  fromIdText: string;
  toIdText: string;
};

export type IdentityRemapMoves = {
  channels: readonly IdentityIdMove[];
  items: readonly IdentityIdMove[];
};

export type IdentitySubscribedChannel = {
  idText: string;
  title: string;
  imageUrl: string | null;
  source: string;
  medium: string;
  kind: string;
  popularityRank: number | null;
};

export type IdentityDownload = {
  itemIdText: string;
  channelIdText: string | null;
  filePath: string | null;
};

export type IdentityPlayback = {
  accountIdText: string;
  queueIdText: string;
  resourceKind: string;
  resourceIdText: string;
  playbackPosition: number;
  mediaFileDuration: number | null;
  completed: boolean;
  zone: string;
  lastMeaningfulAt: number;
};

export type IdentityOutbox = {
  id: number;
  resourceIdText: string;
  playbackPosition: number;
  completed: boolean;
};

export type IdentitySortKey = {
  scopeKind: 'channel' | 'item';
  idText: string;
};

export type IdentitySeen = {
  key: string;
  kind: string;
  at: number;
};

export type IdentityLiveStatus = {
  key: string;
  kind: string;
  statusId: number;
  at: number;
};

export type IdentitySectionChrome = {
  key: string;
  flagsJson: string;
  updatedAt: number;
};

export type IdentityAutoDownload = {
  channelIdText: string;
  source: string;
  enabled: number;
  allowCellular: number;
  enabledAt: number | null;
};

export type IdentityAutoDownloadItem = {
  itemIdText: string;
  channelIdText: string;
  status: string;
};

export type IdentityJsonRow = {
  id: string;
  json: string;
};

export type IdentityChrome = {
  idText: string;
  channelId: number | null;
  notificationsEnabled: boolean | null;
};

export type IdentityPlayableItem = {
  itemIdText: string;
  source: string;
  payloadJson: string;
};

export type IdentityRemapSnapshot = {
  applied: IdentityIdMove[];
  subscribedChannels: IdentitySubscribedChannel[];
  downloads: IdentityDownload[];
  playback: IdentityPlayback[];
  playbackOutbox: IdentityOutbox[];
  sortKeys: IdentitySortKey[];
  channelSeen: IdentitySeen[];
  channelLive: IdentityLiveStatus[];
  sectionChrome: IdentitySectionChrome[];
  autoDownloadChannels: IdentityAutoDownload[];
  autoDownloadItems: IdentityAutoDownloadItem[];
  channelItemChannelIds: string[];
  playlistPayloads: IdentityJsonRow[];
  playlistResourcePayloads: IdentityJsonRow[];
  chrome: IdentityChrome[];
  playableItems: IdentityPlayableItem[];
  lastPlaybackIdText: string | null;
  queueCachePresent: boolean;
};

export type IdentityRemapResult = {
  snapshot: IdentityRemapSnapshot;
  newMoves: IdentityRemapMoves;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

/** A completed row wins. Otherwise the further playback position wins. */
export const preferCompletedThenFurther = <T extends { completed: boolean; playbackPosition: number }>(
  group: readonly T[]
): T => {
  const completedRows = group.filter((row) => row.completed);
  const pool = completedRows.length > 0 ? completedRows : group;
  const first = pool[0];
  if (first === undefined) {
    throw new Error('preferCompletedThenFurther requires a row');
  }
  return pool.reduce((best, row) => (row.playbackPosition > best.playbackPosition ? row : best));
};

/** The later timestamp wins. */
export const preferLaterTimestamp = <T extends { at: number }>(group: readonly T[]): T => {
  const first = group[0];
  if (first === undefined) {
    throw new Error('preferLaterTimestamp requires a row');
  }
  return group.reduce((best, row) => (row.at > best.at ? row : best));
};

/**
 * The row that already used the target id wins. A group of only moved rows keeps the first.
 */
export const preferUnmovedRow = <T>(group: readonly T[], isUnmoved: (row: T) => boolean): T => {
  const found = group.find(isUnmoved);
  if (found !== undefined) {
    return found;
  }
  const first = group[0];
  if (first === undefined) {
    throw new Error('preferUnmovedRow requires a row');
  }
  return first;
};

const finalTarget = (from: string, direct: ReadonlyMap<string, string>): string => {
  const seen = new Set<string>();
  let current = from;
  while (direct.has(current) && !seen.has(current)) {
    seen.add(current);
    const next = direct.get(current);
    if (next === undefined) {
      break;
    }
    current = next;
  }
  return current;
};

const moveMap = (
  incoming: readonly IdentityIdMove[],
  alreadyApplied: readonly IdentityIdMove[]
): Map<string, string> => {
  const appliedSame = new Set(alreadyApplied.map((move) => `${move.fromIdText}\0${move.toIdText}`));
  const direct = new Map<string, string>();
  for (const move of incoming) {
    if (move.fromIdText.length === 0 || move.toIdText.length === 0) {
      continue;
    }
    if (move.fromIdText === move.toIdText) {
      continue;
    }
    direct.set(move.fromIdText, move.toIdText);
  }

  const finals = new Map<string, string>();
  for (const from of direct.keys()) {
    const to = finalTarget(from, direct);
    if (to === from) {
      continue;
    }
    if (appliedSame.has(`${from}\0${to}`)) {
      continue;
    }
    finals.set(from, to);
  }
  return finals;
};

const movesFromMap = (moves: ReadonlyMap<string, string>): IdentityIdMove[] => {
  return [...moves.entries()]
    .map(([fromIdText, toIdText]) => ({ fromIdText, toIdText }))
    .sort((left, right) => left.fromIdText.localeCompare(right.fromIdText));
};

const mapId = (id: string, moves: ReadonlyMap<string, string>): string => {
  return moves.get(id) ?? id;
};

const claimStableThenMoved = <T>(
  rows: readonly T[],
  idOf: (row: T) => string,
  retarget: (row: T) => T,
  keyOf: (row: T) => string
): T[] => {
  const stable: T[] = [];
  const moved: T[] = [];
  for (const row of rows) {
    const next = retarget(row);
    if (keyOf(next) === idOf(row)) {
      stable.push(next);
    } else {
      moved.push(next);
    }
  }

  const seen = new Set(stable.map((row) => keyOf(row)));
  const result = [...stable];
  for (const row of moved) {
    const key = keyOf(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(row);
  }
  return result;
};

const moveSubscribed = (
  channels: readonly IdentitySubscribedChannel[],
  channelMoves: ReadonlyMap<string, string>
): IdentitySubscribedChannel[] => {
  return claimStableThenMoved(
    channels,
    (channel) => channel.idText,
    (channel) => ({ ...channel, idText: mapId(channel.idText, channelMoves) }),
    (channel) => channel.idText
  );
};

const moveDownloads = (
  downloads: readonly IdentityDownload[],
  channelMoves: ReadonlyMap<string, string>,
  itemMoves: ReadonlyMap<string, string>
): IdentityDownload[] => {
  const tagged = downloads.map((row) => ({
    channelIdText: row.channelIdText === null ? null : mapId(row.channelIdText, channelMoves),
    filePath: row.filePath,
    itemIdText: mapId(row.itemIdText, itemMoves),
    originalItemIdText: row.itemIdText,
  }));

  const groups = new Map<string, typeof tagged>();
  for (const row of tagged) {
    const group = groups.get(row.itemIdText) ?? [];
    group.push(row);
    groups.set(row.itemIdText, group);
  }

  const result: IdentityDownload[] = [];
  for (const [itemIdText, group] of groups) {
    const preferred = preferUnmovedRow(
      group,
      (row) => row.originalItemIdText === itemIdText
    );
    result.push({
      channelIdText: preferred.channelIdText,
      filePath: preferred.filePath,
      itemIdText,
    });
  }
  return result;
};

const playbackKey = (row: IdentityPlayback): string => {
  return `${row.accountIdText}\0${row.queueIdText}\0${row.resourceKind}\0${row.resourceIdText}`;
};

const movePlayback = (
  rows: readonly IdentityPlayback[],
  itemMoves: ReadonlyMap<string, string>
): IdentityPlayback[] => {
  const tagged = rows.map((row) => ({
    ...row,
    originalResourceIdText: row.resourceIdText,
    resourceIdText: mapId(row.resourceIdText, itemMoves),
  }));

  const groups = new Map<string, typeof tagged>();
  for (const row of tagged) {
    const key = playbackKey(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  const result: IdentityPlayback[] = [];
  for (const group of groups.values()) {
    const completedRows = group.filter((row) => row.completed);
    const pool = completedRows.length > 0 ? completedRows : group;
    const preferred = preferCompletedThenFurther(pool);
    result.push({
      accountIdText: preferred.accountIdText,
      completed: completedRows.length > 0,
      lastMeaningfulAt: preferred.lastMeaningfulAt,
      mediaFileDuration: preferred.mediaFileDuration,
      playbackPosition: preferred.playbackPosition,
      queueIdText: preferred.queueIdText,
      resourceIdText: preferred.resourceIdText,
      resourceKind: preferred.resourceKind,
      zone: preferred.zone,
    });
  }
  return result;
};

const moveOutbox = (
  rows: readonly IdentityOutbox[],
  itemMoves: ReadonlyMap<string, string>
): IdentityOutbox[] => {
  const tagged = rows.map((row) => ({
    ...row,
    originalResourceIdText: row.resourceIdText,
    resourceIdText: mapId(row.resourceIdText, itemMoves),
  }));

  const groups = new Map<string, typeof tagged>();
  for (const row of tagged) {
    const group = groups.get(row.resourceIdText) ?? [];
    group.push(row);
    groups.set(row.resourceIdText, group);
  }

  const result: IdentityOutbox[] = [];
  for (const group of groups.values()) {
    const completedRows = group.filter((row) => row.completed);
    const pool = completedRows.length > 0 ? completedRows : group;
    const preferred = preferCompletedThenFurther(pool);
    result.push({
      completed: completedRows.length > 0,
      id: preferred.id,
      playbackPosition: preferred.playbackPosition,
      resourceIdText: preferred.resourceIdText,
    });
  }
  return result;
};

const moveSortKeys = (
  keys: readonly IdentitySortKey[],
  channelMoves: ReadonlyMap<string, string>,
  itemMoves: ReadonlyMap<string, string>
): IdentitySortKey[] => {
  return claimStableThenMoved(
    keys,
    (key) => `${key.scopeKind}:${key.idText}`,
    (key) => ({
      idText: mapId(key.idText, key.scopeKind === 'channel' ? channelMoves : itemMoves),
      scopeKind: key.scopeKind,
    }),
    (key) => `${key.scopeKind}:${key.idText}`
  );
};

const moveSeen = (
  rows: readonly IdentitySeen[],
  channelMoves: ReadonlyMap<string, string>
): IdentitySeen[] => {
  const groups = new Map<string, IdentitySeen[]>();
  for (const row of rows) {
    const key = mapId(row.key, channelMoves);
    const group = groups.get(key) ?? [];
    group.push({ ...row, key });
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => preferLaterTimestamp(group));
};

const moveLive = (
  rows: readonly IdentityLiveStatus[],
  channelMoves: ReadonlyMap<string, string>
): IdentityLiveStatus[] => {
  const groups = new Map<string, IdentityLiveStatus[]>();
  for (const row of rows) {
    const key = mapId(row.key, channelMoves);
    const group = groups.get(key) ?? [];
    group.push({ ...row, key });
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => preferLaterTimestamp(group));
};

const retargetSectionKey = (
  key: string,
  channelMoves: ReadonlyMap<string, string>,
  itemMoves: ReadonlyMap<string, string>
): string => {
  if (key.startsWith('channel:')) {
    const idText = key.slice('channel:'.length);
    return `channel:${mapId(idText, channelMoves)}`;
  }
  if (key.startsWith('item:')) {
    const idText = key.slice('item:'.length);
    return `item:${mapId(idText, itemMoves)}`;
  }
  return key;
};

const moveSectionChrome = (
  rows: readonly IdentitySectionChrome[],
  channelMoves: ReadonlyMap<string, string>,
  itemMoves: ReadonlyMap<string, string>
): IdentitySectionChrome[] => {
  return claimStableThenMoved(
    rows,
    (row) => row.key,
    (row) => ({ ...row, key: retargetSectionKey(row.key, channelMoves, itemMoves) }),
    (row) => row.key
  );
};

const moveAutoDownload = (
  rows: readonly IdentityAutoDownload[],
  channelMoves: ReadonlyMap<string, string>
): IdentityAutoDownload[] => {
  return claimStableThenMoved(
    rows,
    (row) => row.channelIdText,
    (row) => ({ ...row, channelIdText: mapId(row.channelIdText, channelMoves) }),
    (row) => row.channelIdText
  );
};

const moveAutoDownloadItems = (
  rows: readonly IdentityAutoDownloadItem[],
  channelMoves: ReadonlyMap<string, string>,
  itemMoves: ReadonlyMap<string, string>
): IdentityAutoDownloadItem[] => {
  const tagged = rows.map((row) => ({
    channelIdText: mapId(row.channelIdText, channelMoves),
    itemIdText: mapId(row.itemIdText, itemMoves),
    originalItemIdText: row.itemIdText,
    status: row.status,
  }));
  const groups = new Map<string, typeof tagged>();
  for (const row of tagged) {
    const group = groups.get(row.itemIdText) ?? [];
    group.push(row);
    groups.set(row.itemIdText, group);
  }
  const result: IdentityAutoDownloadItem[] = [];
  for (const [itemIdText, group] of groups) {
    const preferred = preferUnmovedRow(
      group,
      (row) => row.originalItemIdText === itemIdText
    );
    result.push({
      channelIdText: preferred.channelIdText,
      itemIdText,
      status: preferred.status,
    });
  }
  return result;
};

const replaceIdTexts = (
  value: unknown,
  moves: ReadonlyMap<string, string>,
  state: { changed: boolean }
): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => replaceIdTexts(entry, moves, state));
  }
  if (!isRecord(value)) {
    return value;
  }

  const next: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'id_text' && typeof entry === 'string') {
      const mapped = moves.get(entry);
      if (mapped !== undefined && mapped !== entry) {
        state.changed = true;
        next[key] = mapped;
        continue;
      }
    }
    next[key] = replaceIdTexts(entry, moves, state);
  }
  return next;
};

const replaceIdTextsInJson = (json: string, moves: ReadonlyMap<string, string>): string => {
  if (moves.size === 0) {
    return json;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return json;
  }
  const state = { changed: false };
  const next = replaceIdTexts(parsed, moves, state);
  if (!state.changed) {
    return json;
  }
  return JSON.stringify(next);
};

/** Rewrite `id_text` strings in a JSON payload. Other strings stay as stored. */
export const rewriteJsonIdTexts = replaceIdTextsInJson;

const combinedMoves = (
  channelMoves: ReadonlyMap<string, string>,
  itemMoves: ReadonlyMap<string, string>
): Map<string, string> => {
  const combined = new Map(channelMoves);
  for (const [from, to] of itemMoves) {
    combined.set(from, to);
  }
  return combined;
};

const moveJsonRows = (
  rows: readonly IdentityJsonRow[],
  moves: ReadonlyMap<string, string>
): IdentityJsonRow[] => {
  return rows.map((row) => ({ id: row.id, json: replaceIdTextsInJson(row.json, moves) }));
};

const movePlayableItems = (
  rows: readonly IdentityPlayableItem[],
  channelMoves: ReadonlyMap<string, string>,
  itemMoves: ReadonlyMap<string, string>
): IdentityPlayableItem[] => {
  const textMoves = combinedMoves(channelMoves, itemMoves);
  const tagged = rows.map((row) => ({
    originalItemIdText: row.itemIdText,
    payloadJson: replaceIdTextsInJson(row.payloadJson, textMoves),
    source: row.source,
    itemIdText: mapId(row.itemIdText, itemMoves),
  }));
  const groups = new Map<string, typeof tagged>();
  for (const row of tagged) {
    const key = `${row.itemIdText}\0${row.source}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  const result: IdentityPlayableItem[] = [];
  for (const group of groups.values()) {
    const preferred = preferUnmovedRow(
      group,
      (row) => row.originalItemIdText === row.itemIdText
    );
    result.push({
      itemIdText: preferred.itemIdText,
      payloadJson: preferred.payloadJson,
      source: preferred.source,
    });
  }
  return result;
};

/** Every `id_text` string in a JSON value. Numeric ids are left alone. */
export const collectIdTexts = (value: unknown, into: Set<string>): void => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectIdTexts(entry, into);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'id_text' && typeof entry === 'string' && entry.length > 0) {
      into.add(entry);
    }
    collectIdTexts(entry, into);
  }
};

/**
 * Rewrites one snapshot. A `from` id already applied to the same `to` id is skipped, so a second
 * call with the same moves returns the same snapshot.
 */
export const remapIdentity = (
  snapshot: IdentityRemapSnapshot,
  incoming: IdentityRemapMoves
): IdentityRemapResult => {
  const channelMoves = moveMap(incoming.channels, snapshot.applied);
  const itemMoves = moveMap(incoming.items, snapshot.applied);
  const textMoves = combinedMoves(channelMoves, itemMoves);
  const moved = channelMoves.size > 0 || itemMoves.size > 0;

  const applied = snapshot.applied.filter(
    (row) => !channelMoves.has(row.fromIdText) && !itemMoves.has(row.fromIdText)
  );
  for (const move of movesFromMap(channelMoves)) {
    applied.push(move);
  }
  for (const move of movesFromMap(itemMoves)) {
    applied.push(move);
  }
  applied.sort((left, right) => left.fromIdText.localeCompare(right.fromIdText));

  const lastPlaybackIdText =
    snapshot.lastPlaybackIdText === null ? null : mapId(snapshot.lastPlaybackIdText, itemMoves);

  return {
    newMoves: {
      channels: movesFromMap(channelMoves),
      items: movesFromMap(itemMoves),
    },
    snapshot: {
      applied,
      autoDownloadChannels: moveAutoDownload(snapshot.autoDownloadChannels, channelMoves),
      autoDownloadItems: moveAutoDownloadItems(snapshot.autoDownloadItems, channelMoves, itemMoves),
      channelItemChannelIds: snapshot.channelItemChannelIds.filter(
        (idText) => !channelMoves.has(idText)
      ),
      channelLive: moveLive(snapshot.channelLive, channelMoves),
      channelSeen: moveSeen(snapshot.channelSeen, channelMoves),
      chrome: claimStableThenMoved(
        snapshot.chrome,
        (row) => row.idText,
        (row) => ({ ...row, idText: mapId(row.idText, channelMoves) }),
        (row) => row.idText
      ),
      downloads: moveDownloads(snapshot.downloads, channelMoves, itemMoves),
      lastPlaybackIdText,
      playableItems: movePlayableItems(snapshot.playableItems, channelMoves, itemMoves),
      playback: movePlayback(snapshot.playback, itemMoves),
      playbackOutbox: moveOutbox(snapshot.playbackOutbox, itemMoves),
      playlistPayloads: moveJsonRows(snapshot.playlistPayloads, textMoves),
      playlistResourcePayloads: moveJsonRows(snapshot.playlistResourcePayloads, textMoves),
      queueCachePresent: moved ? false : snapshot.queueCachePresent,
      sectionChrome: moveSectionChrome(snapshot.sectionChrome, channelMoves, itemMoves),
      sortKeys: moveSortKeys(snapshot.sortKeys, channelMoves, itemMoves),
      subscribedChannels: moveSubscribed(snapshot.subscribedChannels, channelMoves),
    },
  };
};
