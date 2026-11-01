import { AppDataSourceReadWrite } from '@orm/db/index.js';
import { Channel } from '@orm/entities/channel/channel.js';
import {
  ChannelMerge,
  ChannelMergeMode,
  ChannelMergeStatus,
} from '@orm/entities/channel/channelMerge.js';
import { ItemMergeMap, ItemMergeMatchTier } from '@orm/entities/channel/itemMergeMap.js';
import { Feed } from '@orm/entities/feed/feed.js';
import { FeedLifecycleStateKeyEnum } from '@orm/entities/feed/feedLifecycleStateType.js';
import { FeedLifecycleUpdateSourceEnum } from '@orm/entities/feed/feedLifecycleUpdateSource.js';
import { loggerService } from '@orm/factories/loggerService.js';
import type {
  DuplicateMatchTier,
  MatchFeed,
  MatchItem,
  PairAssessment,
} from '@orm/lib/duplicateFeedMatch.js';
import { assessDuplicatePair } from '@orm/lib/duplicateFeedMatch.js';
import { isPodcastGuidUniqueViolation } from '@orm/lib/postgresUniqueViolation.js';
import { ChannelVerifiedPublisherService } from '@orm/services/channel/channelVerifiedPublisher.js';
import type { EntityManager } from 'typeorm';

import { POPULARITY_TASTE_HALF_LIFE_DAYS } from '@podverse/helpers';

import { FeedService } from '../feed/feed.js';
import type { SqlKey } from './channelMergeRowJournal.js';
import {
  journaledDelete,
  journaledInsert,
  journaledUpdate,
  revertChannelMergeJournal,
  selectMergeRows,
} from './channelMergeRowJournal.js';

export type SurvivorFeedSnapshot = {
  url: string;
  match: MatchFeed;
};

export type RepointParseRequest = {
  feedUrl: string;
  podcastIndexId: number;
  options: {
    forceParse: true;
    onDemandParserEvent: {
      accountId: null;
      remoteParentPodcastIndexId: null;
      type: null;
    };
    suppressNewItemSideEffectsPublishedBeforeMs: number;
  };
};

export type VerifyAndApplyDuplicateMergesOptions = {
  mode: 'dry_run' | 'apply';
  fetchSurvivorFeed: (podcastIndexId: number) => Promise<SurvivorFeedSnapshot | null>;
  enqueueRepointParse: (request: RepointParseRequest) => Promise<void>;
  /**
   * `STATS_TRACK_EVENT_RETENTION_DAYS`. Daily totals on days this recent drop listeners who
   * listened to both copies that day; older days are summed.
   */
  statsTrackEventRetentionDays: number;
};

type StoredChannel = {
  channelId: number;
  feedId: number;
  feedUrl: string;
  podcastIndexId: number;
};

type RepointTarget = {
  fromItemId: number;
  guid: string | null;
  enclosureUrl: string | null;
  tier: DuplicateMatchTier;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sqlKey(value: unknown): SqlKey | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value !== '') {
    return value;
  }
  return null;
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function timestampMs(value: unknown): number | null {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function assessmentStats(assessment: PairAssessment): Record<string, unknown> {
  return {
    oldCount: assessment.stats.oldCount,
    survivorCount: assessment.stats.survivorCount,
    matched: assessment.stats.matched,
    byTier: assessment.stats.byTier,
    sharedPodcastGuid: assessment.stats.sharedPodcastGuid,
    sharedItunesId: assessment.stats.sharedItunesId,
    selfLinkAgrees: assessment.stats.selfLinkAgrees,
  };
}

function rowImage(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isRecord(value) ? value : null;
}

function confidenceText(value: number): string {
  if (!Number.isFinite(value)) {
    return '0.0000';
  }
  return Math.min(1, Math.max(0, value)).toFixed(4);
}

function matchTier(tier: DuplicateMatchTier): ItemMergeMatchTier {
  if (tier === 'guid') {
    return ItemMergeMatchTier.Guid;
  }
  if (tier === 'enclosure') {
    return ItemMergeMatchTier.Enclosure;
  }
  return ItemMergeMatchTier.Fuzzy;
}

function isFuzzyTier(tier: unknown): boolean {
  return tier === ItemMergeMatchTier.Fuzzy || tier === 'fuzzy';
}

function errorText(error: unknown, key: string): string {
  if (typeof error !== 'object' || error === null || !(key in error)) {
    return '';
  }
  const value: unknown = Reflect.get(error, key);
  return typeof value === 'string' ? value : '';
}

/** Raw `manager.query` raises the driver error, not TypeORM's wrapper. */
function isPodcastGuidCollision(error: unknown): boolean {
  if (isPodcastGuidUniqueViolation(error)) {
    return true;
  }
  if (errorText(error, 'code') !== '23505') {
    return false;
  }
  const text = ['message', 'constraint', 'detail'].map((key) => errorText(error, key)).join('\n');
  return text.includes('podcast_guid');
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function pubDateMs(value: unknown): number | null {
  return timestampMs(value);
}

function durationSeconds(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = asNumber(value);
  return value === 0 || value === '0' || parsed !== 0 ? parsed : null;
}

async function lockMerge(manager: EntityManager, id: number): Promise<ChannelMerge | null> {
  return manager
    .getRepository(ChannelMerge)
    .createQueryBuilder('channel_merge')
    .setLock('pessimistic_write')
    .where('channel_merge.id = :id', { id })
    .getOne();
}

async function storedChannel(
  manager: EntityManager,
  podcastIndexId: number
): Promise<StoredChannel | null> {
  const feed = await manager.getRepository(Feed).findOne({
    where: { podcast_index_id: podcastIndexId },
  });
  if (feed === null) {
    return null;
  }
  const channel = await manager.getRepository(Channel).findOne({
    where: { feed_id: feed.id },
  });
  if (channel === null) {
    return null;
  }
  return {
    channelId: channel.id,
    feedId: feed.id,
    feedUrl: feed.url,
    podcastIndexId: feed.podcast_index_id,
  };
}

async function matchFeedForChannel(manager: EntityManager, channelId: number): Promise<MatchFeed> {
  const channel = await manager.getRepository(Channel).findOne({ where: { id: channelId } });
  const rows: unknown = await manager.query(
    `SELECT i.id, i.guid, i.guid_enclosure_url, i.title, i.pub_date, ia.duration,
            (
              SELECT s.uri
              FROM item_enclosure e
              JOIN item_enclosure_source s ON s.item_enclosure_id = e.id
              WHERE e.item_id = i.id
              ORDER BY e.item_enclosure_default DESC, e.id ASC, s.id ASC
              LIMIT 1
            ) AS enclosure_uri
     FROM item i
     LEFT JOIN item_about ia ON ia.item_id = i.id
     WHERE i.channel_id = $1
       AND (i.item_flag_status_id IS NULL OR i.item_flag_status_id = 1)`,
    [channelId]
  );
  const items: MatchItem[] = [];
  if (Array.isArray(rows)) {
    for (const entry of rows) {
      if (!isRecord(entry) || typeof entry.id !== 'number') {
        continue;
      }
      const enclosureUri = nullableText(entry.enclosure_uri);
      items.push({
        id: entry.id,
        guid: nullableText(entry.guid),
        enclosureUrl: enclosureUri ?? nullableText(entry.guid_enclosure_url),
        title: nullableText(entry.title),
        pubDateMs: pubDateMs(entry.pub_date),
        durationSeconds: durationSeconds(entry.duration),
      });
    }
  }
  return {
    podcastGuid: channel?.podcast_guid ?? null,
    itunesId: null,
    selfUrl: null,
    items,
  };
}

async function replaceItemMap(
  manager: EntityManager,
  channelMergeId: number,
  oldItems: readonly MatchItem[],
  pairs: PairAssessment['pairs'],
  toItemId: (fromId: number) => number | null
): Promise<void> {
  await manager.getRepository(ItemMergeMap).delete({ channel_merge_id: channelMergeId });
  const pairByFrom = new Map(pairs.map((pair) => [pair.fromId, pair]));
  for (const item of oldItems) {
    const pair = pairByFrom.get(item.id);
    const row = manager.getRepository(ItemMergeMap).create({
      channel_merge_id: channelMergeId,
      from_item_id: item.id,
      to_item_id: pair === undefined ? null : toItemId(pair.fromId),
      match_tier: pair === undefined ? null : matchTier(pair.tier),
    });
    await manager.getRepository(ItemMergeMap).save(row);
  }
}

function repointTargets(
  pairs: PairAssessment['pairs'],
  survivorItems: readonly MatchItem[]
): RepointTarget[] {
  const byId = new Map(survivorItems.map((item) => [item.id, item]));
  const targets: RepointTarget[] = [];
  for (const pair of pairs) {
    const survivor = byId.get(pair.toId);
    if (survivor === undefined) {
      continue;
    }
    targets.push({
      fromItemId: pair.fromId,
      guid: survivor.guid,
      enclosureUrl: survivor.enclosureUrl,
      tier: pair.tier,
    });
  }
  return targets;
}

function readRepointTargets(stats: Record<string, unknown>): RepointTarget[] {
  const raw = stats.repointTargets;
  if (!Array.isArray(raw)) {
    return [];
  }
  const targets: RepointTarget[] = [];
  for (const entry of raw) {
    if (!isRecord(entry) || typeof entry.fromItemId !== 'number') {
      continue;
    }
    const tier = entry.tier;
    if (tier !== 'guid' && tier !== 'enclosure' && tier !== 'fuzzy') {
      continue;
    }
    targets.push({
      fromItemId: entry.fromItemId,
      guid: nullableText(entry.guid),
      enclosureUrl: nullableText(entry.enclosureUrl),
      tier,
    });
  }
  return targets;
}

async function saveAssessment(
  manager: EntityManager,
  merge: ChannelMerge,
  input: {
    mode: ChannelMergeMode;
    status: ChannelMergeStatus;
    confidence: number;
    fromChannelId: number | null;
    toChannelId: number | null;
    note: string | null;
    stats: Record<string, unknown>;
  }
): Promise<void> {
  merge.mode = input.mode;
  merge.status = input.status;
  merge.confidence = confidenceText(input.confidence);
  merge.from_channel_id = input.fromChannelId;
  merge.to_channel_id = input.toChannelId;
  merge.note = input.note;
  merge.match_stats = input.stats;
  await manager.getRepository(ChannelMerge).save(merge);
}

async function assessMerge(
  manager: EntityManager,
  channelMergeId: number,
  fetchSurvivorFeed: VerifyAndApplyDuplicateMergesOptions['fetchSurvivorFeed']
): Promise<void> {
  const merge = await lockMerge(manager, channelMergeId);
  if (merge === null || merge.status !== ChannelMergeStatus.Detected) {
    return;
  }

  const from = await storedChannel(manager, merge.from_podcast_index_id);
  if (from === null) {
    return;
  }
  const to = await storedChannel(manager, merge.to_podcast_index_id);
  if (to !== null && to.channelId === from.channelId) {
    merge.note = 'already_one_channel';
    merge.from_channel_id = from.channelId;
    await manager.getRepository(ChannelMerge).save(merge);
    await manager.getRepository(ItemMergeMap).delete({ channel_merge_id: merge.id });
    return;
  }

  const oldFeed = await matchFeedForChannel(manager, from.channelId);
  if (to === null) {
    const snapshot = await fetchSurvivorFeed(merge.to_podcast_index_id);
    if (snapshot === null) {
      await saveAssessment(manager, merge, {
        mode: ChannelMergeMode.Repoint,
        status: ChannelMergeStatus.NeedsReview,
        confidence: 0,
        fromChannelId: from.channelId,
        toChannelId: null,
        note: 'survivor_fetch_failed',
        stats: { oldCount: oldFeed.items.length, survivorCount: 0, matched: 0 },
      });
      await manager.getRepository(ItemMergeMap).delete({ channel_merge_id: merge.id });
      return;
    }
    const assessment = assessDuplicatePair(oldFeed, snapshot.match);
    await replaceItemMap(manager, merge.id, oldFeed.items, assessment.pairs, () => null);
    await saveAssessment(manager, merge, {
      mode: ChannelMergeMode.Repoint,
      status:
        assessment.status === 'verified'
          ? ChannelMergeStatus.Verified
          : ChannelMergeStatus.NeedsReview,
      confidence: assessment.confidence,
      fromChannelId: from.channelId,
      toChannelId: null,
      note: null,
      stats: {
        ...assessmentStats(assessment),
        survivorUrl: snapshot.url,
        survivorPodcastGuid: snapshot.match.podcastGuid,
        repointTargets: repointTargets(assessment.pairs, snapshot.match.items),
      },
    });
    return;
  }

  const survivorFeed = await matchFeedForChannel(manager, to.channelId);
  const assessment = assessDuplicatePair(oldFeed, survivorFeed);
  await replaceItemMap(manager, merge.id, oldFeed.items, assessment.pairs, (fromId) => {
    const pair = assessment.pairs.find((entry) => entry.fromId === fromId);
    return pair === undefined ? null : pair.toId;
  });
  await saveAssessment(manager, merge, {
    mode: ChannelMergeMode.Absorb,
    status:
      assessment.status === 'verified'
        ? ChannelMergeStatus.Verified
        : ChannelMergeStatus.NeedsReview,
    confidence: assessment.confidence,
    fromChannelId: from.channelId,
    toChannelId: to.channelId,
    note: null,
    stats: assessmentStats(assessment),
  });
}

async function assignPodcastGuid(
  manager: EntityManager,
  channelMergeId: number,
  channelId: number,
  podcastGuid: string
): Promise<boolean> {
  const existing = await selectMergeRows(manager, 'channel', { id: channelId });
  if (existing[0]?.podcast_guid === podcastGuid) {
    return false;
  }
  await manager.query('SAVEPOINT channel_merge_podcast_guid');
  try {
    await journaledUpdate(
      manager,
      channelMergeId,
      'channel',
      { id: channelId },
      {
        podcast_guid: podcastGuid,
      }
    );
    await manager.query('RELEASE SAVEPOINT channel_merge_podcast_guid');
    return false;
  } catch (error) {
    await manager.query('ROLLBACK TO SAVEPOINT channel_merge_podcast_guid');
    await manager.query('RELEASE SAVEPOINT channel_merge_podcast_guid');
    if (isPodcastGuidCollision(error)) {
      return true;
    }
    throw error;
  }
}

async function moveFollows(
  manager: EntityManager,
  channelMergeId: number,
  fromChannelId: number,
  toChannelId: number
): Promise<void> {
  const follows = await selectMergeRows(manager, 'account_following_channel', {
    channel_id: fromChannelId,
  });
  for (const follow of follows) {
    const accountId = sqlKey(follow.account_id);
    if (accountId === null) {
      continue;
    }
    const existing = await selectMergeRows(manager, 'account_following_channel', {
      account_id: accountId,
      channel_id: toChannelId,
    });
    if (existing.length === 0) {
      await journaledInsert(manager, channelMergeId, 'account_following_channel', {
        account_id: accountId,
        channel_id: toChannelId,
      });
    }
    await journaledDelete(manager, channelMergeId, 'account_following_channel', {
      account_id: accountId,
      channel_id: fromChannelId,
    });
  }
}

async function moveNotificationChannels(
  manager: EntityManager,
  channelMergeId: number,
  fromChannelId: number,
  toChannelId: number
): Promise<void> {
  const rows = await selectMergeRows(manager, 'account_notification_channel', {
    channel_id: fromChannelId,
  });
  for (const row of rows) {
    const id = sqlKey(row.id);
    const accountId = sqlKey(row.account_id);
    if (id === null || accountId === null) {
      continue;
    }
    const types = await selectMergeRows(manager, 'account_notification_channel_type', {
      account_notification_channel_id: id,
    });
    const existing = await selectMergeRows(manager, 'account_notification_channel', {
      account_id: accountId,
      channel_id: toChannelId,
    });
    if (existing.length === 0) {
      const inserted = await journaledInsert(
        manager,
        channelMergeId,
        'account_notification_channel',
        {
          account_id: accountId,
          channel_id: toChannelId,
        }
      );
      const insertedId = sqlKey(inserted.id);
      if (insertedId !== null) {
        for (const typeRow of types) {
          if (typeof typeRow.type !== 'string') {
            continue;
          }
          await journaledInsert(manager, channelMergeId, 'account_notification_channel_type', {
            account_notification_channel_id: insertedId,
            type: typeRow.type,
          });
        }
      }
    }
    for (const typeRow of types) {
      const typeId = sqlKey(typeRow.id);
      if (typeId === null) {
        continue;
      }
      await journaledDelete(manager, channelMergeId, 'account_notification_channel_type', {
        id: typeId,
      });
    }
    await journaledDelete(manager, channelMergeId, 'account_notification_channel', { id });
  }
}

async function moveAutoDownload(
  manager: EntityManager,
  channelMergeId: number,
  fromChannelId: number,
  toChannelId: number
): Promise<void> {
  const rows = await selectMergeRows(manager, 'account_device_auto_download_channel', {
    channel_id: fromChannelId,
  });
  for (const row of rows) {
    const id = sqlKey(row.id);
    const accountId = sqlKey(row.account_id);
    if (id === null || accountId === null || typeof row.installation_id !== 'string') {
      continue;
    }
    const existing = await selectMergeRows(manager, 'account_device_auto_download_channel', {
      account_id: accountId,
      installation_id: row.installation_id,
      channel_id: toChannelId,
    });
    if (existing.length === 0) {
      await journaledInsert(manager, channelMergeId, 'account_device_auto_download_channel', {
        account_id: accountId,
        installation_id: row.installation_id,
        channel_id: toChannelId,
      });
    }
    await journaledDelete(manager, channelMergeId, 'account_device_auto_download_channel', { id });
  }
}

async function removeVerifiedPublisherLinks(
  manager: EntityManager,
  channelMergeId: number,
  channelId: number
): Promise<void> {
  for (const column of ['channel_id', 'publisher_channel_id']) {
    const rows = await selectMergeRows(manager, 'channel_verified_publisher', {
      [column]: channelId,
    });
    for (const row of rows) {
      const id = sqlKey(row.id);
      if (id === null) {
        continue;
      }
      await journaledDelete(manager, channelMergeId, 'channel_verified_publisher', { id });
    }
  }
}

async function movePendingFollows(
  manager: EntityManager,
  channelMergeId: number,
  from: StoredChannel,
  to: StoredChannel
): Promise<void> {
  const result: unknown = await manager.query(
    `SELECT row_to_json(t) AS row
     FROM account_pending_following_channel t
     WHERE podcast_index_id = $1 OR feed_url = $2`,
    [from.podcastIndexId, from.feedUrl]
  );
  if (!Array.isArray(result)) {
    return;
  }
  for (const entry of result) {
    if (!isRecord(entry)) {
      continue;
    }
    const row = rowImage(entry.row);
    if (row === null) {
      continue;
    }
    const id = sqlKey(row.id);
    const accountId = sqlKey(row.account_id);
    if (id === null || accountId === null) {
      continue;
    }
    const taken = await selectMergeRows(manager, 'account_pending_following_channel', {
      account_id: accountId,
      feed_url: to.feedUrl,
    });
    const blocked = taken.some((existing) => sqlKey(existing.id) !== id);
    if (blocked) {
      await journaledDelete(manager, channelMergeId, 'account_pending_following_channel', { id });
    } else {
      await journaledUpdate(
        manager,
        channelMergeId,
        'account_pending_following_channel',
        { id },
        {
          podcast_index_id: to.podcastIndexId,
          feed_url: to.feedUrl,
        }
      );
    }
  }
}

async function moveQueueRows(
  manager: EntityManager,
  channelMergeId: number,
  fromItemId: SqlKey,
  toItemId: SqlKey,
  fuzzy: boolean
): Promise<void> {
  const rows = await selectMergeRows(manager, 'queue_resource', { item_id: fromItemId });
  for (const row of rows) {
    const id = sqlKey(row.id);
    const queueId = sqlKey(row.queue_id);
    if (id === null || queueId === null) {
      continue;
    }
    const destination = await selectMergeRows(manager, 'queue_resource', {
      queue_id: queueId,
      item_id: toItemId,
    });
    const other = destination[0];
    const completed = row.completed === true || other?.completed === true;
    let position = Math.max(asNumber(row.playback_position), asNumber(other?.playback_position));
    if (fuzzy && !completed) {
      position = 0;
    }
    if (other !== undefined) {
      const otherId = sqlKey(other.id);
      if (otherId !== null) {
        await journaledUpdate(
          manager,
          channelMergeId,
          'queue_resource',
          { id: otherId },
          {
            completed,
            playback_position: position,
          }
        );
      }
      await journaledDelete(manager, channelMergeId, 'queue_resource', { id });
    } else {
      await journaledUpdate(
        manager,
        channelMergeId,
        'queue_resource',
        { id },
        {
          item_id: toItemId,
          completed,
          playback_position: position,
        }
      );
    }
  }
}

async function moveItemColumn(
  manager: EntityManager,
  channelMergeId: number,
  table: 'clip' | 'playlist_resource',
  fromItemId: SqlKey,
  toItemId: SqlKey
): Promise<number> {
  const rows = await selectMergeRows(manager, table, { item_id: fromItemId });
  for (const row of rows) {
    const id = sqlKey(row.id);
    if (id === null) {
      continue;
    }
    if (table === 'playlist_resource') {
      const playlistId = sqlKey(row.playlist_id);
      if (playlistId !== null) {
        const existing = await selectMergeRows(manager, 'playlist_resource', {
          playlist_id: playlistId,
          item_id: toItemId,
        });
        if (existing.length > 0) {
          await journaledDelete(manager, channelMergeId, table, { id });
          continue;
        }
      }
    }
    await journaledUpdate(manager, channelMergeId, table, { id }, { item_id: toItemId });
  }
  return rows.length;
}

type MergeStatsKey = 'channel_id' | 'item_id';

/** Listeners (and finishers) with listen events on both copies on one UTC day. */
type SameDayOverlap = { listeners: number; completions: number };

type SameDayOverlapRow = SameDayOverlap & { day: string };

function isSameDayOverlapRow(value: unknown): value is SameDayOverlapRow {
  return (
    isRecord(value) &&
    typeof value.day === 'string' &&
    typeof value.listeners === 'number' &&
    typeof value.completions === 'number'
  );
}

/** Runs a `SELECT … FOR UPDATE` and keeps its row locks without reading the rows back. */
async function lockRows(
  manager: EntityManager,
  lockingSelectSql: string,
  params: readonly unknown[]
): Promise<void> {
  await manager.query(`SELECT count(*)::int AS locked FROM (${lockingSelectSql}) locked_rows`, [
    ...params,
  ]);
}

/**
 * Locks taken before any popularity row moves. The popularity refresh job's per-type advisory
 * locks come first, so no refresh writes a range row the merge deletes before it commits. Row
 * locks follow the listen write path's order (events, item daily rows, channel daily rows): the
 * old channel's events, and any matched old item's events, come first, so a completion report on
 * one of them waits at its event row while holding nothing the merge needs.
 */
async function lockMergeStatsRows(
  manager: EntityManager,
  fromChannelId: number,
  channelIds: readonly number[],
  oldItemIds: readonly number[],
  survivorItemIds: readonly number[]
): Promise<void> {
  await manager.query(
    `SELECT pg_advisory_xact_lock(hashtextextended('popularity_refresh:channel', 0))`
  );
  await manager.query(
    `SELECT pg_advisory_xact_lock(hashtextextended('popularity_refresh:item', 0))`
  );
  await lockRows(
    manager,
    `SELECT 1 FROM stats_listen_event
     WHERE channel_id = $1 OR item_id = ANY($2::int[])
     FOR UPDATE`,
    [fromChannelId, [...oldItemIds]]
  );
  const itemIds = [...oldItemIds, ...survivorItemIds];
  if (itemIds.length > 0) {
    await lockRows(
      manager,
      'SELECT 1 FROM stats_daily_item WHERE item_id = ANY($1::int[]) FOR UPDATE',
      [itemIds]
    );
  }
  await lockRows(
    manager,
    'SELECT 1 FROM stats_daily_channel WHERE channel_id = ANY($1::int[]) FOR UPDATE',
    [[...channelIds]]
  );
}

/**
 * The first UTC day whose listen events are all still stored: the current UTC date minus the
 * retention days, on the merge transaction's clock.
 */
async function retentionBoundaryDay(
  manager: EntityManager,
  retentionDays: number
): Promise<string> {
  const rows: unknown = await manager.query(
    `SELECT ((now() AT TIME ZONE 'UTC')::date - $1::integer)::text AS boundary_day`,
    [retentionDays]
  );
  const first: unknown = Array.isArray(rows) ? rows[0] : null;
  const boundaryDay = isRecord(first) ? nullableText(first.boundary_day) : null;
  if (boundaryDay === null) {
    throw new Error('channel merge: could not read the retention boundary day');
  }
  return boundaryDay;
}

/**
 * Per UTC day on or after `boundaryDay`, the listeners with popularity-counted listen events on
 * both copies, and those with a completed one on both. Keyed by `YYYY-MM-DD`.
 */
async function readSameDayOverlap(
  manager: EntityManager,
  key: MergeStatsKey,
  fromId: SqlKey,
  toId: SqlKey,
  boundaryDay: string
): Promise<Map<string, SameDayOverlap>> {
  const rows: unknown = await manager.query(
    `WITH per_copy AS (
       SELECT listener_id,
              (created_at AT TIME ZONE 'UTC')::date AS day,
              ${key} = $1 AS on_old,
              bool_or(completed) AS completed
       FROM stats_listen_event
       WHERE ${key} IN ($1, $2)
         AND created_at >= ($3::date)::timestamp AT TIME ZONE 'UTC'
         AND popularity_counted
       GROUP BY 1, 2, 3
     )
     SELECT o.day::text AS day,
            COUNT(*)::int AS listeners,
            (COUNT(*) FILTER (WHERE o.completed AND s.completed))::int AS completions
     FROM per_copy o
     JOIN per_copy s ON s.listener_id = o.listener_id AND s.day = o.day AND NOT s.on_old
     WHERE o.on_old
     GROUP BY o.day`,
    [fromId, toId, boundaryDay]
  );
  const overlap = new Map<string, SameDayOverlap>();
  if (!Array.isArray(rows)) {
    return overlap;
  }
  for (const row of rows) {
    if (isSameDayOverlapRow(row)) {
      overlap.set(row.day, { listeners: row.listeners, completions: row.completions });
    }
  }
  return overlap;
}

/** One copy's daily row. */
type DailyCopyCounts = SameDayOverlap & { allTimeListeners: number };

/**
 * One day's merged totals. Overlap is removed, but the result never goes below either copy, and
 * finishers never exceed listeners. All-time listeners are added and capped at the merged
 * listeners; no all-time overlap is removed.
 */
function mergedDailyCounts(
  old: DailyCopyCounts,
  survivor: DailyCopyCounts,
  shared: SameDayOverlap
): { listener_count: number; completion_count: number; all_time_listener_count: number } {
  const listenerCount = Math.max(
    old.listeners + survivor.listeners - shared.listeners,
    old.listeners,
    survivor.listeners
  );
  const completionCount = Math.min(
    Math.max(
      old.completions + survivor.completions - shared.completions,
      old.completions,
      survivor.completions
    ),
    listenerCount
  );
  return {
    listener_count: listenerCount,
    completion_count: completionCount,
    all_time_listener_count: Math.min(
      old.allTimeListeners + survivor.allTimeListeners,
      listenerCount
    ),
  };
}

/**
 * Adds every old daily row into the survivor's row for the same day, or moves it when the survivor
 * has none, then deletes the old row. Same-day overlap is removed only on days on or after
 * `boundaryDay`. Every write is journaled.
 */
async function moveDailyTotals(
  manager: EntityManager,
  channelMergeId: number,
  table: 'stats_daily_channel' | 'stats_daily_item',
  key: MergeStatsKey,
  fromId: SqlKey,
  toId: SqlKey,
  overlap: ReadonlyMap<string, SameDayOverlap>,
  boundaryDay: string
): Promise<void> {
  const oldRows = await selectMergeRows(manager, table, { [key]: fromId });
  if (oldRows.length === 0) {
    return;
  }
  const survivorByDay = new Map<string, Record<string, unknown>>();
  for (const row of await selectMergeRows(manager, table, { [key]: toId })) {
    const day = nullableText(row.day);
    if (day !== null) {
      survivorByDay.set(day, row);
    }
  }
  for (const oldRow of oldRows) {
    const day = nullableText(oldRow.day);
    if (day === null) {
      continue;
    }
    const old: DailyCopyCounts = {
      listeners: asNumber(oldRow.listener_count),
      completions: asNumber(oldRow.completion_count),
      allTimeListeners: asNumber(oldRow.all_time_listener_count),
    };
    const survivorRow = survivorByDay.get(day);
    if (survivorRow === undefined) {
      await journaledInsert(manager, channelMergeId, table, {
        [key]: toId,
        day,
        listener_count: old.listeners,
        completion_count: old.completions,
        all_time_listener_count: old.allTimeListeners,
      });
    } else {
      const survivor: DailyCopyCounts = {
        listeners: asNumber(survivorRow.listener_count),
        completions: asNumber(survivorRow.completion_count),
        allTimeListeners: asNumber(survivorRow.all_time_listener_count),
      };
      const shared = (day >= boundaryDay ? overlap.get(day) : undefined) ?? {
        listeners: 0,
        completions: 0,
      };
      await journaledUpdate(
        manager,
        channelMergeId,
        table,
        { [key]: toId, day },
        mergedDailyCounts(old, survivor, shared)
      );
    }
    await journaledDelete(manager, channelMergeId, table, { [key]: fromId, day });
  }
}

/** Journals and deletes the merged-away copy's range row. The survivor's row is not written. */
async function deleteMergedPopularityRow(
  manager: EntityManager,
  channelMergeId: number,
  table: 'stats_popularity_channel' | 'stats_popularity_item',
  key: MergeStatsKey,
  fromId: SqlKey
): Promise<void> {
  await journaledDelete(manager, channelMergeId, table, { [key]: fromId });
}

/**
 * Not journaled: listen events are listener-linked and must stay within retention and opt-out.
 * `created_at` does not change, so rows stay in their partitions.
 */
async function moveListenEvents(
  manager: EntityManager,
  fromItemId: SqlKey,
  toItemId: SqlKey,
  toChannelId: number
): Promise<void> {
  await manager.query(
    `UPDATE stats_listen_event SET item_id = $1, channel_id = $2 WHERE item_id = $3`,
    [toItemId, toChannelId, fromItemId]
  );
}

/**
 * Every remaining event of the old channel counts toward the survivor channel; unmatched items
 * keep their `item_id`. Not journaled, for the reason `moveListenEvents` gives.
 */
async function moveChannelListenEvents(
  manager: EntityManager,
  fromChannelId: number,
  toChannelId: number
): Promise<void> {
  await manager.query(`UPDATE stats_listen_event SET channel_id = $2 WHERE channel_id = $1`, [
    fromChannelId,
    toChannelId,
  ]);
}

function elapsedDaysSql(interval: string): string {
  return `(extract(epoch FROM ${interval})::double precision / 86400.0)`;
}

/**
 * Merges the old channel's taste and Not Counted in Recommendations rows into the survivor. Not
 * journaled (listener-linked rows stay within retention and opt-out). A show left out of
 * recommendations on either copy stays left out on the survivor and loses both taste rows. Two
 * taste rows for one listener become one: counts add, listen times widen, and each score fades
 * to the later `scores_updated_at` and adds.
 */
async function mergeTasteRows(
  manager: EntityManager,
  fromChannelId: number,
  toChannelId: number
): Promise<void> {
  const ids = [fromChannelId, toChannelId];
  await lockRows(
    manager,
    `SELECT 1 FROM stats_taste_profile
     WHERE channel_id = $1
        OR (channel_id = $2 AND listener_id IN (
              SELECT listener_id FROM stats_taste_profile WHERE channel_id = $1
              UNION
              SELECT listener_id FROM stats_taste_profile_hidden WHERE channel_id = $1
            ))
     FOR UPDATE`,
    ids
  );

  await manager.query(
    `INSERT INTO stats_taste_profile_hidden (listener_id, channel_id, hidden_at)
     SELECT listener_id, $2::int, hidden_at FROM stats_taste_profile_hidden WHERE channel_id = $1
     ON CONFLICT (listener_id, channel_id) DO NOTHING`,
    ids
  );
  await manager.query(`DELETE FROM stats_taste_profile_hidden WHERE channel_id = $1`, [
    fromChannelId,
  ]);

  await manager.query(
    `DELETE FROM stats_taste_profile tp
     WHERE tp.channel_id IN ($1, $2)
       AND EXISTS (
         SELECT 1 FROM stats_taste_profile_hidden h
         WHERE h.listener_id = tp.listener_id AND h.channel_id = $2
       )`,
    ids
  );

  const latest = 'GREATEST(s.scores_updated_at, f.scores_updated_at)';
  const fadedSum = (column: 'recent_score' | 'long_term_score', halfLife: string): string =>
    `s.${column} * power(0.5, ${elapsedDaysSql(`${latest} - s.scores_updated_at`)} / ${halfLife})
       + f.${column} * power(0.5, ${elapsedDaysSql(`${latest} - f.scores_updated_at`)} / ${halfLife})`;
  await manager.query(
    `UPDATE stats_taste_profile s SET
       listen_count = s.listen_count + f.listen_count,
       completion_count = s.completion_count + f.completion_count,
       first_listened_at = LEAST(s.first_listened_at, f.first_listened_at),
       last_listened_at = GREATEST(s.last_listened_at, f.last_listened_at),
       recent_score = ${fadedSum('recent_score', '$3::double precision')},
       long_term_score = ${fadedSum('long_term_score', '$4::double precision')},
       scores_updated_at = ${latest}
     FROM stats_taste_profile f
     WHERE s.channel_id = $2 AND f.channel_id = $1 AND f.listener_id = s.listener_id`,
    [
      fromChannelId,
      toChannelId,
      POPULARITY_TASTE_HALF_LIFE_DAYS.recent,
      POPULARITY_TASTE_HALF_LIFE_DAYS.longTerm,
    ]
  );
  await manager.query(
    `DELETE FROM stats_taste_profile f
     WHERE f.channel_id = $1
       AND EXISTS (
         SELECT 1 FROM stats_taste_profile s
         WHERE s.channel_id = $2 AND s.listener_id = f.listener_id
       )`,
    ids
  );
  await manager.query(`UPDATE stats_taste_profile SET channel_id = $2 WHERE channel_id = $1`, ids);
}

/**
 * Moves Hidden Channels rows onto the survivor. Not journaled (listener-linked). A show
 * hidden on either copy stays hidden on the survivor.
 */
async function mergeChannelHiddenRows(
  manager: EntityManager,
  fromChannelId: number,
  toChannelId: number
): Promise<void> {
  const ids = [fromChannelId, toChannelId];
  await manager.query(
    `INSERT INTO stats_channel_hidden (listener_id, channel_id, hidden_at)
     SELECT listener_id, $2::int, hidden_at FROM stats_channel_hidden WHERE channel_id = $1
     ON CONFLICT (listener_id, channel_id) DO NOTHING`,
    ids
  );
  await manager.query(`DELETE FROM stats_channel_hidden WHERE channel_id = $1`, [
    fromChannelId,
  ]);
  await manager.query(
    `DELETE FROM stats_recommendation
     WHERE channel_id = $2
       AND EXISTS (
         SELECT 1 FROM stats_channel_hidden h
         WHERE h.listener_id = stats_recommendation.listener_id AND h.channel_id = $2
       )`,
    ids
  );
}

async function listenerKeepsItem(manager: EntityManager, itemId: SqlKey): Promise<boolean> {
  const queue = await selectMergeRows(manager, 'queue_resource', { item_id: itemId });
  if (queue.length > 0) {
    return true;
  }
  const clips = await selectMergeRows(manager, 'clip', { item_id: itemId });
  if (clips.length > 0) {
    return true;
  }
  const playlists = await selectMergeRows(manager, 'playlist_resource', { item_id: itemId });
  return playlists.length > 0;
}

/**
 * Popularity data moves under row locks rather than per-listener locks; one merge can cover more
 * listeners than one transaction should hold advisory locks for. The channel's same-day overlap
 * is read before any event moves, because moving an item's events rewrites their `channel_id`.
 * Each item pair reads its overlap after the earlier pairs' events moved, so several old items
 * matched to one survivor item are each counted against everything merged before them. After the
 * matched pairs, every remaining old-channel event moves to the survivor channel, so the
 * survivor's day, week, and month counts include the old copy's listeners.
 */
async function applyAbsorb(
  manager: EntityManager,
  merge: ChannelMerge,
  from: StoredChannel,
  to: StoredChannel,
  statsTrackEventRetentionDays: number
): Promise<void> {
  await moveFollows(manager, merge.id, from.channelId, to.channelId);
  await moveNotificationChannels(manager, merge.id, from.channelId, to.channelId);
  await moveAutoDownload(manager, merge.id, from.channelId, to.channelId);
  await movePendingFollows(manager, merge.id, from, to);
  await removeVerifiedPublisherLinks(manager, merge.id, from.channelId);

  const maps = await manager.getRepository(ItemMergeMap).find({
    where: { channel_merge_id: merge.id },
    order: { id: 'ASC' },
  });
  const matched: { fromItemId: number; toItemId: number; fuzzy: boolean }[] = [];
  for (const map of maps) {
    if (map.to_item_id !== null) {
      matched.push({
        fromItemId: map.from_item_id,
        toItemId: map.to_item_id,
        fuzzy: isFuzzyTier(map.match_tier),
      });
    }
  }

  await lockMergeStatsRows(
    manager,
    from.channelId,
    [from.channelId, to.channelId],
    matched.map((pair) => pair.fromItemId),
    matched.map((pair) => pair.toItemId)
  );
  const boundaryDay = await retentionBoundaryDay(manager, statsTrackEventRetentionDays);

  const channelOverlap = await readSameDayOverlap(
    manager,
    'channel_id',
    from.channelId,
    to.channelId,
    boundaryDay
  );
  await moveDailyTotals(
    manager,
    merge.id,
    'stats_daily_channel',
    'channel_id',
    from.channelId,
    to.channelId,
    channelOverlap,
    boundaryDay
  );
  await deleteMergedPopularityRow(
    manager,
    merge.id,
    'stats_popularity_channel',
    'channel_id',
    from.channelId
  );

  let uncertainClipCount = 0;
  for (const pair of matched) {
    await moveQueueRows(manager, merge.id, pair.fromItemId, pair.toItemId, pair.fuzzy);
    const clipCount = await moveItemColumn(
      manager,
      merge.id,
      'clip',
      pair.fromItemId,
      pair.toItemId
    );
    if (pair.fuzzy) {
      uncertainClipCount += clipCount;
    }
    await moveItemColumn(manager, merge.id, 'playlist_resource', pair.fromItemId, pair.toItemId);
    const itemOverlap = await readSameDayOverlap(
      manager,
      'item_id',
      pair.fromItemId,
      pair.toItemId,
      boundaryDay
    );
    await moveDailyTotals(
      manager,
      merge.id,
      'stats_daily_item',
      'item_id',
      pair.fromItemId,
      pair.toItemId,
      itemOverlap,
      boundaryDay
    );
    await deleteMergedPopularityRow(
      manager,
      merge.id,
      'stats_popularity_item',
      'item_id',
      pair.fromItemId
    );
    await moveListenEvents(manager, pair.fromItemId, pair.toItemId, to.channelId);
  }
  await moveChannelListenEvents(manager, from.channelId, to.channelId);

  let unmatchedKept = 0;
  for (const map of maps) {
    if (map.to_item_id !== null) {
      continue;
    }
    if (await listenerKeepsItem(manager, map.from_item_id)) {
      unmatchedKept += 1;
      continue;
    }
    await journaledUpdate(
      manager,
      merge.id,
      'item',
      { id: map.from_item_id },
      {
        item_flag_status_id: 2,
      }
    );
  }

  await mergeTasteRows(manager, from.channelId, to.channelId);
  await mergeChannelHiddenRows(manager, from.channelId, to.channelId);

  await new FeedService().setFeedLifecycleState(
    from.feedId,
    {
      toStateKey: FeedLifecycleStateKeyEnum.Merged,
      source: FeedLifecycleUpdateSourceEnum.System,
    },
    { manager }
  );

  merge.match_stats = {
    ...merge.match_stats,
    uncertainClipCount,
    unmatchedKept,
  };
  merge.mode = ChannelMergeMode.Absorb;
  merge.to_channel_id = to.channelId;
}

async function applyRepoint(
  manager: EntityManager,
  merge: ChannelMerge,
  from: StoredChannel
): Promise<RepointParseRequest | null> {
  const stats = merge.match_stats;
  const survivorUrl = nullableText(stats.survivorUrl);
  if (survivorUrl === null) {
    throw new Error(`channel merge ${merge.id} is missing the survivor feed URL`);
  }
  for (const target of readRepointTargets(stats)) {
    const set: Record<string, unknown> = {};
    if (target.guid !== null) {
      set.guid = target.guid;
    }
    if (target.enclosureUrl !== null) {
      set.guid_enclosure_url = target.enclosureUrl;
    }
    if (Object.keys(set).length === 0) {
      continue;
    }
    await journaledUpdate(manager, merge.id, 'item', { id: target.fromItemId }, set);
  }

  const feedRows = await selectMergeRows(manager, 'feed', { id: from.feedId });
  const hash = feedRows[0]?.last_parsed_file_hash;
  const feedSet: Record<string, unknown> = {
    url: survivorUrl,
    podcast_index_id: merge.to_podcast_index_id,
  };
  if (hash !== null && hash !== undefined) {
    feedSet.last_parsed_file_hash = null;
  }
  await journaledUpdate(manager, merge.id, 'feed', { id: from.feedId }, feedSet);

  const survivorGuid = nullableText(stats.survivorPodcastGuid);
  if (survivorGuid !== null) {
    const collided = await assignPodcastGuid(manager, merge.id, from.channelId, survivorGuid);
    if (collided) {
      merge.match_stats = { ...merge.match_stats, guidCollision: true };
    }
  }

  merge.mode = ChannelMergeMode.Repoint;
  merge.to_channel_id = null;
  return {
    feedUrl: survivorUrl,
    podcastIndexId: merge.to_podcast_index_id,
    options: {
      forceParse: true,
      onDemandParserEvent: {
        accountId: null,
        remoteParentPodcastIndexId: null,
        type: null,
      },
      suppressNewItemSideEffectsPublishedBeforeMs: 0,
    },
  };
}

async function appliedAtMs(manager: EntityManager, channelMergeId: number): Promise<number> {
  const rows: unknown = await manager.query(`SELECT applied_at FROM channel_merge WHERE id = $1`, [
    channelMergeId,
  ]);
  const first = Array.isArray(rows) ? rows[0] : null;
  if (isRecord(first)) {
    const ms = timestampMs(first.applied_at);
    if (ms !== null) {
      return ms;
    }
  }
  return Date.now();
}

async function applyMerge(
  manager: EntityManager,
  channelMergeId: number,
  statsTrackEventRetentionDays: number
): Promise<RepointParseRequest | null> {
  const merge = await lockMerge(manager, channelMergeId);
  if (merge === null || merge.status !== ChannelMergeStatus.Verified) {
    return null;
  }
  const from = await storedChannel(manager, merge.from_podcast_index_id);
  if (from === null) {
    return null;
  }

  let request: RepointParseRequest | null = null;
  if (merge.mode === ChannelMergeMode.Repoint) {
    request = await applyRepoint(manager, merge, from);
  } else if (merge.mode === ChannelMergeMode.Absorb) {
    const to = await storedChannel(manager, merge.to_podcast_index_id);
    if (to === null || to.channelId === from.channelId) {
      return null;
    }
    await applyAbsorb(manager, merge, from, to, statsTrackEventRetentionDays);
  } else {
    return null;
  }

  merge.status = ChannelMergeStatus.Applied;
  merge.applied_at = new Date();
  await manager.getRepository(ChannelMerge).save(merge);
  if (request !== null) {
    request.options.suppressNewItemSideEffectsPublishedBeforeMs = await appliedAtMs(
      manager,
      merge.id
    );
  }
  return request;
}

function warnMerge(channelMergeId: number, error: unknown): void {
  loggerService.warn('Duplicate merge failed', { channelMergeId, error });
}

export async function verifyAndApplyDuplicateMerges(
  options: VerifyAndApplyDuplicateMergesOptions
): Promise<void> {
  const { statsTrackEventRetentionDays } = options;
  if (!Number.isInteger(statsTrackEventRetentionDays) || statsTrackEventRetentionDays < 1) {
    throw new Error('statsTrackEventRetentionDays must be a positive integer');
  }
  const repo = AppDataSourceReadWrite.getRepository(ChannelMerge);
  const detected = await repo.find({
    where: { status: ChannelMergeStatus.Detected },
    order: { id: 'ASC' },
  });
  for (const row of detected) {
    try {
      await AppDataSourceReadWrite.transaction((manager) =>
        assessMerge(manager, row.id, options.fetchSurvivorFeed)
      );
    } catch (error) {
      warnMerge(row.id, error);
    }
  }

  if (options.mode !== 'apply') {
    return;
  }

  const verified = await repo.find({
    where: { status: ChannelMergeStatus.Verified },
    order: { id: 'ASC' },
  });
  for (const row of verified) {
    try {
      const request = await AppDataSourceReadWrite.transaction((manager) =>
        applyMerge(manager, row.id, statsTrackEventRetentionDays)
      );
      const applied = await repo.findOne({ where: { id: row.id } });
      if (
        applied !== null &&
        applied.status === ChannelMergeStatus.Applied &&
        applied.mode === ChannelMergeMode.Absorb &&
        applied.to_channel_id !== null
      ) {
        try {
          await new ChannelVerifiedPublisherService().recomputeForChannel(applied.to_channel_id);
        } catch (error) {
          warnMerge(row.id, error);
        }
      }
      if (request !== null) {
        try {
          await options.enqueueRepointParse(request);
        } catch (error) {
          warnMerge(row.id, error);
        }
      }
    } catch (error) {
      warnMerge(row.id, error);
    }
  }
}

export async function revertChannelMerge(channelMergeId: number): Promise<void> {
  await AppDataSourceReadWrite.transaction(async (manager) => {
    const merge = await lockMerge(manager, channelMergeId);
    if (merge === null || merge.status !== ChannelMergeStatus.Applied) {
      return;
    }
    await revertChannelMergeJournal(manager, merge.id);
    if (merge.mode === ChannelMergeMode.Absorb && merge.from_channel_id !== null) {
      const channel = await manager.getRepository(Channel).findOne({
        where: { id: merge.from_channel_id },
      });
      if (channel !== null) {
        await new FeedService().setFeedLifecycleState(
          channel.feed_id,
          {
            toStateKey: FeedLifecycleStateKeyEnum.Active,
            source: FeedLifecycleUpdateSourceEnum.System,
            transitionOptions: { explicitManagementOverride: true },
          },
          { manager }
        );
      }
    }
    merge.status = ChannelMergeStatus.Reverted;
    await manager.getRepository(ChannelMerge).save(merge);
  });
}
