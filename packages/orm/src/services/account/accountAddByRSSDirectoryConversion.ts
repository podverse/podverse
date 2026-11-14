import { AppDataSourceReadWrite } from '@orm/db/index.js';
import type { Channel } from '@orm/entities/channel/channel.js';
import { loggerService } from '@orm/factories/loggerService.js';
import type { EntityManager } from 'typeorm';

import type {
  DTOAddByRSSConvertedItem,
  DTOAddByRSSConvertResponse,
  DTOChannelDirectoryMatch,
} from '@podverse/helpers';
import { extractAddByRSSHashInput, splitFeedUrlUserinfo } from '@podverse/helpers';
import {
  addByRSSDirectoryMatchUrlVariants,
  canonicalAddByRSSFeedUrl,
} from '@podverse/helpers-validation';

import { ChannelAddByRSSDirectoryMatchService } from '../channel/channelAddByRSSDirectoryMatch.js';
import { assertNewFollowAllowed, FollowLimitReachedError } from './accountFollowLimit.js';

export type AddByRssDirectoryRowSurface = 'queue' | 'playlist';

export type AddByRssDirectoryCollisionDecision =
  | { action: 'leave' }
  | { action: 'move' }
  | { action: 'drop'; playbackPosition: string | null };

type LoadedRow = {
  surface: AddByRssDirectoryRowSurface;
  id: number;
  parentId: number;
  listPosition: string;
  playbackPosition: string | null;
  hashId: string;
  resourceData: unknown;
  sourceRemoved: boolean;
};

type MatchedRow = LoadedRow & { itemId: number; itemIdText: string };

type KeptDirectoryRow = { id: number; playbackPosition: string | null };

type ConversionCounts = {
  items: DTOAddByRSSConvertedItem[];
  queueRowsMoved: number;
  queueRowsDropped: number;
  playlistRowsMoved: number;
  playlistRowsDropped: number;
};

type TransactionOutcome =
  | { status: 'not_followed' }
  | { status: 'requires_credentials' }
  | { status: 'follow_limit' }
  | { status: 'converted'; counts: ConversionCounts };

const QUEUE_ROWS_SQL = `
SELECT qr.id,
       qr.queue_id,
       qr.list_position::text AS list_position,
       qr.playback_position::text AS playback_position,
       qr.add_by_rss_hash_id,
       qr.add_by_rss_resource_data
FROM queue_resource qr
INNER JOIN queue q ON q.id = qr.queue_id
WHERE q.account_id = $1
  AND qr.add_by_rss_hash_id IS NOT NULL
  AND qr.add_by_rss_resource_data->>'feed_url' = ANY($2::text[])
ORDER BY qr.id
`;

const PLAYLIST_ROWS_SQL = `
SELECT pr.id,
       pr.playlist_id,
       pr.list_position::text AS list_position,
       pr.add_by_rss_hash_id,
       pr.add_by_rss_resource_data,
       pr.source_removed_at
FROM playlist_resource pr
INNER JOIN playlist p ON p.id = pr.playlist_id
WHERE p.account_id = $1
  AND pr.add_by_rss_hash_id IS NOT NULL
  AND pr.add_by_rss_resource_data->>'feed_url' = ANY($2::text[])
ORDER BY pr.id
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordsFrom(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected query rows');
  }
  const rows: Record<string, unknown>[] = [];
  for (const row of value) {
    if (!isRecord(row)) {
      throw new Error('Expected a query row');
    }
    rows.push(row);
  }
  return rows;
}

function requiredInt(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  throw new Error(`Expected integer ${key}`);
}

function requiredText(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value === 'string' && value !== '') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  throw new Error(`Expected text ${key}`);
}

function optionalText(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  throw new Error(`Expected text ${key}`);
}

function requiredBoolean(row: Record<string, unknown>, key: string): boolean {
  const value = row[key];
  if (typeof value === 'boolean') {
    return value;
  }
  throw new Error(`Expected boolean ${key}`);
}

function timestampField(row: Record<string, unknown>, key: string): Date | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  throw new Error(`Expected timestamp ${key}`);
}

function resourceDataValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed;
  } catch {
    return null;
  }
}

function feedUrlFromResource(resourceData: unknown): string | null {
  if (!isRecord(resourceData)) {
    return null;
  }
  const feedUrl = resourceData['feed_url'];
  return typeof feedUrl === 'string' ? feedUrl : null;
}

function trimmedText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * True when this payload's feed URL has the same canonical Add by RSS form as `canonical`.
 * Host case, a default port, and a trailing slash on a non-root path are not different feeds.
 */
export function addByRssResourceMatchesCanonicalFeed(
  resourceData: unknown,
  canonical: string
): boolean {
  const feedUrl = feedUrlFromResource(resourceData);
  if (feedUrl === null) {
    return false;
  }
  return canonicalAddByRSSFeedUrl(feedUrl) === canonical;
}

/**
 * Guid and enclosure used to find the directory episode.
 * A real guid is tried first. The enclosure stays available so a guid that is not in the
 * directory can still match the episode file. A guid made up on a device is omitted.
 */
export function directoryEpisodeRefFromAddByRssResource(resourceData: unknown): {
  guid: string | null;
  enclosureUrl: string | null;
} {
  const extracted = extractAddByRSSHashInput(resourceData);
  const guid = extracted['guid'] ?? null;
  const extractedEnclosure = extracted['enclosure_url'] ?? null;
  if (extractedEnclosure !== null) {
    return { guid, enclosureUrl: extractedEnclosure };
  }
  if (!isRecord(resourceData)) {
    return { guid, enclosureUrl: null };
  }
  return { guid, enclosureUrl: trimmedText(resourceData['enclosure_url']) };
}

function playbackNumber(value: string | null): number {
  if (value === null) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * What to do with one Add by RSS row that maps to a directory episode.
 * A playlist row whose source was removed stays. A duplicate is removed.
 * A duplicate in queue history keeps the larger playback position on the directory row.
 */
export function decideAddByRssDirectoryCollision(input: {
  surface: AddByRssDirectoryRowSurface;
  directoryRowPresent: boolean;
  listPosition: string;
  addByRssPlaybackPosition: string | null;
  directoryPlaybackPosition: string | null;
  sourceRemoved: boolean;
}): AddByRssDirectoryCollisionDecision {
  if (input.surface === 'playlist' && input.sourceRemoved) {
    return { action: 'leave' };
  }
  if (!input.directoryRowPresent) {
    return { action: 'move' };
  }
  if (input.surface !== 'queue') {
    return { action: 'drop', playbackPosition: null };
  }
  const listPosition = Number(input.listPosition);
  const isHistory = Number.isFinite(listPosition) && listPosition < 0;
  if (!isHistory) {
    return { action: 'drop', playbackPosition: null };
  }
  const addByRssPosition = playbackNumber(input.addByRssPlaybackPosition);
  const directoryPosition = playbackNumber(input.directoryPlaybackPosition);
  if (addByRssPosition > directoryPosition) {
    return { action: 'drop', playbackPosition: input.addByRssPlaybackPosition ?? '0' };
  }
  return { action: 'drop', playbackPosition: null };
}

function directoryKey(
  surface: AddByRssDirectoryRowSurface,
  parentId: number,
  itemId: number
): string {
  return `${surface}:${parentId}:${itemId}`;
}

function queueRowFrom(row: Record<string, unknown>): LoadedRow {
  return {
    surface: 'queue',
    id: requiredInt(row, 'id'),
    parentId: requiredInt(row, 'queue_id'),
    listPosition: requiredText(row, 'list_position'),
    playbackPosition: optionalText(row, 'playback_position'),
    hashId: requiredText(row, 'add_by_rss_hash_id'),
    resourceData: resourceDataValue(row['add_by_rss_resource_data']),
    sourceRemoved: false,
  };
}

function playlistRowFrom(row: Record<string, unknown>): LoadedRow {
  const removedAt = row['source_removed_at'];
  return {
    surface: 'playlist',
    id: requiredInt(row, 'id'),
    parentId: requiredInt(row, 'playlist_id'),
    listPosition: requiredText(row, 'list_position'),
    playbackPosition: null,
    hashId: requiredText(row, 'add_by_rss_hash_id'),
    resourceData: resourceDataValue(row['add_by_rss_resource_data']),
    sourceRemoved: removedAt !== null && removedAt !== undefined,
  };
}

async function loadFeedRows(
  manager: EntityManager,
  accountId: number,
  variants: string[],
  canonical: string
): Promise<LoadedRow[]> {
  if (variants.length === 0) {
    return [];
  }
  const queueRows = recordsFrom(await manager.query(QUEUE_ROWS_SQL, [accountId, variants]));
  const playlistRows = recordsFrom(await manager.query(PLAYLIST_ROWS_SQL, [accountId, variants]));
  const loaded = [...queueRows.map(queueRowFrom), ...playlistRows.map(playlistRowFrom)];
  return loaded.filter((row) => addByRssResourceMatchesCanonicalFeed(row.resourceData, canonical));
}

async function itemIdsByIdText(
  manager: EntityManager,
  idTexts: string[]
): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  if (idTexts.length === 0) {
    return ids;
  }
  const rows = recordsFrom(
    await manager.query(
      `SELECT id, id_text::text AS id_text FROM item WHERE id_text::text = ANY($1::text[])`,
      [idTexts]
    )
  );
  for (const row of rows) {
    ids.set(requiredText(row, 'id_text'), requiredInt(row, 'id'));
  }
  return ids;
}

async function keptDirectoryRows(
  manager: EntityManager,
  surface: AddByRssDirectoryRowSurface,
  parentIds: number[],
  itemIds: number[]
): Promise<Map<string, KeptDirectoryRow>> {
  const kept = new Map<string, KeptDirectoryRow>();
  if (parentIds.length === 0 || itemIds.length === 0) {
    return kept;
  }
  const sql =
    surface === 'queue'
      ? `SELECT id, queue_id AS parent_id, item_id, playback_position::text AS playback_position
         FROM queue_resource
         WHERE queue_id = ANY($1::int[]) AND item_id = ANY($2::int[])`
      : `SELECT id, playlist_id AS parent_id, item_id, NULL::text AS playback_position
         FROM playlist_resource
         WHERE playlist_id = ANY($1::int[]) AND item_id = ANY($2::int[])`;
  const rows = recordsFrom(await manager.query(sql, [parentIds, itemIds]));
  for (const row of rows) {
    const key = directoryKey(surface, requiredInt(row, 'parent_id'), requiredInt(row, 'item_id'));
    if (kept.has(key)) {
      continue;
    }
    kept.set(key, {
      id: requiredInt(row, 'id'),
      playbackPosition: optionalText(row, 'playback_position'),
    });
  }
  return kept;
}

function parentIdsFor(rows: readonly MatchedRow[], surface: AddByRssDirectoryRowSurface): number[] {
  return [
    ...new Set(rows.filter((row) => row.surface === surface).map((row) => row.parentId)),
  ];
}

async function moveRow(manager: EntityManager, row: MatchedRow): Promise<void> {
  const sql =
    row.surface === 'queue'
      ? `UPDATE queue_resource
         SET item_id = $2, add_by_rss_hash_id = NULL, add_by_rss_resource_data = NULL
         WHERE id = $1`
      : `UPDATE playlist_resource
         SET item_id = $2, add_by_rss_hash_id = NULL, add_by_rss_resource_data = NULL
         WHERE id = $1`;
  await manager.query(sql, [row.id, row.itemId]);
}

async function dropRow(
  manager: EntityManager,
  row: MatchedRow,
  kept: KeptDirectoryRow,
  playbackPosition: string | null
): Promise<void> {
  if (row.surface === 'queue' && playbackPosition !== null) {
    await manager.query(
      `UPDATE queue_resource SET playback_position = $2::numeric WHERE id = $1`,
      [kept.id, playbackPosition]
    );
    kept.playbackPosition = playbackPosition;
  }
  const sql =
    row.surface === 'queue'
      ? `DELETE FROM queue_resource WHERE id = $1`
      : `DELETE FROM playlist_resource WHERE id = $1`;
  await manager.query(sql, [row.id]);
}

function countMove(counts: ConversionCounts, surface: AddByRssDirectoryRowSurface): void {
  if (surface === 'queue') {
    counts.queueRowsMoved += 1;
    return;
  }
  counts.playlistRowsMoved += 1;
}

function countDrop(counts: ConversionCounts, surface: AddByRssDirectoryRowSurface): void {
  if (surface === 'queue') {
    counts.queueRowsDropped += 1;
    return;
  }
  counts.playlistRowsDropped += 1;
}

async function applyMatchedRow(
  manager: EntityManager,
  row: MatchedRow,
  keptRows: Map<string, KeptDirectoryRow>,
  counts: ConversionCounts
): Promise<void> {
  const key = directoryKey(row.surface, row.parentId, row.itemId);
  const kept = keptRows.get(key);
  const decision = decideAddByRssDirectoryCollision({
    surface: row.surface,
    directoryRowPresent: kept !== undefined,
    listPosition: row.listPosition,
    addByRssPlaybackPosition: row.playbackPosition,
    directoryPlaybackPosition: kept?.playbackPosition ?? null,
    sourceRemoved: row.sourceRemoved,
  });
  if (decision.action === 'leave') {
    return;
  }
  counts.items.push({ add_by_rss_hash_id: row.hashId, item_id_text: row.itemIdText });
  if (decision.action === 'move') {
    await moveRow(manager, row);
    keptRows.set(key, { id: row.id, playbackPosition: row.playbackPosition });
    countMove(counts, row.surface);
    return;
  }
  if (kept === undefined) {
    throw new Error('Duplicate directory row was not loaded');
  }
  await dropRow(manager, row, kept, decision.playbackPosition);
  countDrop(counts, row.surface);
}

async function moveFeedRows(
  manager: EntityManager,
  channel: Channel,
  rows: LoadedRow[],
  matchService: ChannelAddByRSSDirectoryMatchService
): Promise<ConversionCounts> {
  const counts: ConversionCounts = {
    items: [],
    queueRowsMoved: 0,
    queueRowsDropped: 0,
    playlistRowsMoved: 0,
    playlistRowsDropped: 0,
  };
  if (rows.length === 0) {
    return counts;
  }

  const refs = rows.map((row) => directoryEpisodeRefFromAddByRssResource(row.resourceData));
  const idTexts = await matchService.getItemIdTextsForChannel(channel, refs);
  const wanted = idTexts.filter((idText): idText is string => idText !== null);
  const itemIdByText = await itemIdsByIdText(manager, wanted);

  const matched: MatchedRow[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const idText = idTexts[index];
    if (row === undefined || idText === undefined || idText === null) {
      continue;
    }
    const itemId = itemIdByText.get(idText);
    if (itemId === undefined) {
      continue;
    }
    matched.push({ ...row, itemId, itemIdText: idText });
  }

  const itemIds = [...new Set(matched.map((row) => row.itemId))];
  const keptRows = new Map<string, KeptDirectoryRow>([
    ...(
      await keptDirectoryRows(manager, 'queue', parentIdsFor(matched, 'queue'), itemIds)
    ).entries(),
    ...(
      await keptDirectoryRows(manager, 'playlist', parentIdsFor(matched, 'playlist'), itemIds)
    ).entries(),
  ]);

  for (const row of matched) {
    await applyMatchedRow(manager, row, keptRows, counts);
  }
  return counts;
}

async function convertFollow(
  manager: EntityManager,
  input: {
    accountId: number;
    canonical: string;
    channel: Channel;
    matchService: ChannelAddByRSSDirectoryMatchService;
  }
): Promise<TransactionOutcome> {
  const locked = recordsFrom(
    await manager.query(
      `SELECT feed_url, requires_credentials, last_seen_at
       FROM account_following_add_by_rss_channel
       WHERE account_id = $1 AND feed_url = $2
       FOR UPDATE`,
      [input.accountId, input.canonical]
    )
  );
  const follow = locked[0];
  if (follow === undefined) {
    return { status: 'not_followed' };
  }
  if (requiredBoolean(follow, 'requires_credentials')) {
    return { status: 'requires_credentials' };
  }

  const lastSeenAt = timestampField(follow, 'last_seen_at');
  const alreadyChannel = recordsFrom(
    await manager.query(
      `SELECT 1 AS present
       FROM account_following_channel
       WHERE account_id = $1 AND channel_id = $2`,
      [input.accountId, input.channel.id]
    )
  );
  if (alreadyChannel.length === 0) {
    try {
      await assertNewFollowAllowed(manager, input.accountId);
    } catch (error) {
      if (error instanceof FollowLimitReachedError) {
        return { status: 'follow_limit' };
      }
      throw error;
    }
  }
  await manager.query(
    `INSERT INTO account_following_channel (account_id, channel_id, last_seen_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (account_id, channel_id) DO NOTHING`,
    [input.accountId, input.channel.id, lastSeenAt]
  );
  await manager.query(
    `UPDATE account_following_channel
     SET last_seen_at = GREATEST(last_seen_at, $3)
     WHERE account_id = $1 AND channel_id = $2`,
    [input.accountId, input.channel.id, lastSeenAt]
  );

  const variants = addByRSSDirectoryMatchUrlVariants(input.canonical);
  const rows = await loadFeedRows(manager, input.accountId, variants, input.canonical);
  const counts = await moveFeedRows(manager, input.channel, rows, input.matchService);

  await manager.query(
    `DELETE FROM account_following_add_by_rss_channel
     WHERE account_id = $1 AND feed_url = $2`,
    [input.accountId, input.canonical]
  );
  return { status: 'converted', counts };
}

/**
 * One account's Add by RSS follow becomes a directory channel follow. Queue and owned
 * playlist rows for that feed move onto directory episodes, matched by guid and then
 * enclosure URL. Rows that do not match stay Add by RSS rows. The whole change is one
 * transaction.
 */
export class AccountAddByRSSDirectoryConversionService {
  private readonly matchService = new ChannelAddByRSSDirectoryMatchService();

  async convert(params: {
    accountId: number;
    feedUrl: string;
    feedGuid: string | null;
  }): Promise<DTOAddByRSSConvertResponse> {
    const split = splitFeedUrlUserinfo(params.feedUrl);
    if (split.username !== null || split.password !== null) {
      return { converted: false, reason: 'no_match', channel: null };
    }
    const canonical = canonicalAddByRSSFeedUrl(params.feedUrl);
    if (canonical === null) {
      return { converted: false, reason: 'no_match', channel: null };
    }

    const matches = await this.matchService.getForFeedUrls([
      { feedUrl: canonical, feedGuid: params.feedGuid },
    ]);
    const found = matches.get(canonical);
    if (found === undefined) {
      return { converted: false, reason: 'no_match', channel: null };
    }

    const outcome = await AppDataSourceReadWrite.transaction((manager) =>
      convertFollow(manager, {
        accountId: params.accountId,
        canonical,
        channel: found.channel,
        matchService: this.matchService,
      })
    );

    return conversionResponse(outcome, params.accountId, found.match);
  }
}

function conversionResponse(
  outcome: TransactionOutcome,
  accountId: number,
  match: DTOChannelDirectoryMatch
): DTOAddByRSSConvertResponse {
  if (outcome.status === 'not_followed') {
    return { converted: false, reason: 'not_followed', channel: match };
  }
  if (outcome.status === 'requires_credentials') {
    return { converted: false, reason: 'requires_credentials', channel: null };
  }
  if (outcome.status === 'follow_limit') {
    return { converted: false, reason: 'follow_limit', channel: null };
  }

  loggerService.info('Add by RSS follow moved to directory channel', {
    accountId,
    channelIdText: match.id_text,
    queueRowsMoved: outcome.counts.queueRowsMoved,
    queueRowsDropped: outcome.counts.queueRowsDropped,
    playlistRowsMoved: outcome.counts.playlistRowsMoved,
    playlistRowsDropped: outcome.counts.playlistRowsDropped,
  });

  return {
    converted: true,
    channel: match,
    items: outcome.counts.items,
    queue_rows_moved: outcome.counts.queueRowsMoved,
    queue_rows_dropped: outcome.counts.queueRowsDropped,
    playlist_rows_moved: outcome.counts.playlistRowsMoved,
    playlist_rows_dropped: outcome.counts.playlistRowsDropped,
  };
}
