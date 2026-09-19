import { and, asc, desc, eq, inArray, ne, or } from 'drizzle-orm';

import { toEpochMsOrNull } from '@podverse/helpers';
import type { DTOQueue, DTOQueueResource, QueueExtraParams } from '@podverse/helpers/dto';
import type { PlaybackEventKind, PlaybackZone } from '@podverse/helpers/playbackEvents';
import { PLAYBACK_EVENT_KINDS } from '@podverse/helpers/playbackEvents';
import { PLAYBACK_REPLAY_BATCH_LIMIT } from '@podverse/helpers/playbackOutboxLimits';
import { computeClockOffsetMs } from '@podverse/helpers/playbackTimestamps';

import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { createUuid } from '../../lib/createUuid';
import { isEffectivelyOffline } from '../../net/connectivity';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';
import { readPlaybackClockOffsetMs, writePlaybackClockOffsetMs } from '../sync';
import type {
  PlaybackLocalStateValue,
  PlaybackOutboxEnqueueEvent,
  PlaybackOutboxResourceKind,
} from './playbackOutbox';
import {
  eventKindEmitsRemovalTombstone,
  mergePlaybackLocalState,
  PLAYBACK_OUTBOX_RESOURCE_KINDS,
  selectPlaybackOutboxEvictions,
  shouldCollapsePlaybackEvent,
  shouldCollapseQueueReorderEvent,
  shouldEnqueuePlaybackEvent,
  toPlaybackLocalStateValue,
  toReplayOccurredAtIso,
} from './playbackOutbox';
import type {
  PlaybackReconcileDifferentNowPlayingConflict,
  PlaybackReconcileOutboxEvent,
  PlaybackReconcilePushAction,
  PlaybackReconcileResourceState,
} from './playbackReconcile';
import { findNowPlayingInvariantViolations, planPlaybackReconcile } from './playbackReconcile';
import { queueRepository } from './queueRepository';
import type { PlaybackStatsTargets } from './statsRepository';
import { statsRepository } from './statsRepository';
import type { MobileAuthRequestContext } from './types';

type PlaybackReplayEventPayload = {
  playback_event_kind: PlaybackEventKind;
  last_played_at: string;
  playback_position?: number;
  media_file_duration?: number;
  completed?: boolean;
  item_id_text?: string;
  clip_id_text?: string;
  item_soundbite_id_text?: string;
  add_by_rss_hash_id?: string;
  add_by_rss_resource_data?: object;
};

type PlaybackReplayResponse = {
  data: unknown[];
};

export type PlaybackOutboxDrainResult = {
  deletedRows: number;
  replayedEvents: number;
};

export type PlaybackOutboxReconcileResult = PlaybackOutboxDrainResult & {
  adoptedRows: number;
  /** Now-playing positions another device advanced, for the player to move to. */
  adoptPositions: PlaybackReconcileResourceState[];
  pushedEvents: number;
  resolveConflicts: PlaybackReconcileDifferentNowPlayingConflict[];
};

export type PlaybackLocalStateRecord = {
  accountIdText: string;
  queueIdText: string;
  resourceKind: PlaybackOutboxResourceKind;
  resourceIdText: string;
  playbackPosition: number;
  mediaFileDuration: number | null;
  completed: boolean;
  zone: PlaybackZone;
  lastMeaningfulAt: number;
};

type PlaybackOutboxRowShape = {
  id: number;
  accountIdText: string;
  queueIdText: string;
  resourceKind: string;
  resourceIdText: string;
  eventKind: string;
  occurredAt: number;
  playbackPosition: number | null;
  mediaFileDuration: number | null;
  completed: number | null;
  payloadJson: string | null;
};

type HeaderMapLike = {
  get: (name: string) => string | null | undefined;
};

const isHeaderMapLike = (value: unknown): value is HeaderMapLike => {
  return (
    typeof value === 'object' && value !== null && 'get' in value && typeof value.get === 'function'
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isAddByRssResourceDataLike = (value: unknown): value is object => {
  return isRecord(value) && typeof value.feed_url === 'string' && value.feed_url.length > 0;
};

const extractAddByRssResourceDataFromPayloadValue = (payload: unknown): object | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const nested = payload.add_by_rss_resource_data;
  if (isAddByRssResourceDataLike(nested)) {
    return nested;
  }
  if (isAddByRssResourceDataLike(payload)) {
    return payload;
  }

  return null;
};

const normalizePositiveNumber = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
};

const isPlaybackEventKind = (value: string): value is PlaybackEventKind => {
  for (const kind of PLAYBACK_EVENT_KINDS) {
    if (kind === value) {
      return true;
    }
  }
  return false;
};

const isPlaybackOutboxResourceKind = (value: string): value is PlaybackOutboxResourceKind => {
  for (const kind of PLAYBACK_OUTBOX_RESOURCE_KINDS) {
    if (kind === value) {
      return true;
    }
  }
  return false;
};

const isPlaybackZone = (value: string): value is PlaybackZone => {
  return (
    value === 'history' || value === 'now_playing' || value === 'upcoming' || value === 'removed'
  );
};

const readDateHeader = (headers: unknown): string | null => {
  if (isHeaderMapLike(headers)) {
    const header = headers.get('date');
    return typeof header === 'string' && header.length > 0 ? header : null;
  }

  if (!isRecord(headers)) {
    return null;
  }

  const header = headers.date;
  if (typeof header === 'string') {
    return header;
  }
  if (Array.isArray(header) && typeof header[0] === 'string') {
    return header[0];
  }
  return null;
};

const parsePayloadObject = (payloadJson: string | null): Record<string, unknown> | null => {
  if (payloadJson === null) {
    return null;
  }
  const parsed = safeJsonParse<unknown>(payloadJson);
  return isRecord(parsed) ? parsed : null;
};

const normalizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseStatsReplayPayload = (payloadJson: string | null): PlaybackStatsTargets | null => {
  const payload = parsePayloadObject(payloadJson);
  if (payload === null) {
    return null;
  }
  const statsTargets = payload.stats_targets;
  if (!isRecord(statsTargets)) {
    return null;
  }

  const channelIdText = normalizeNonEmptyString(statsTargets.channel_id_text);
  const clipIdText = normalizeNonEmptyString(statsTargets.clip_id_text);
  const itemIdText = normalizeNonEmptyString(statsTargets.item_id_text);
  if (channelIdText === null && clipIdText === null && itemIdText === null) {
    return null;
  }

  return { channelIdText, clipIdText, itemIdText };
};

const extractAddByRssResourceData = (
  row: Pick<PlaybackOutboxRowShape, 'payloadJson' | 'resourceKind'>
): object | undefined => {
  if (row.resourceKind !== 'add_by_rss') {
    return undefined;
  }

  const payload = parsePayloadObject(row.payloadJson);
  if (payload === null) {
    return undefined;
  }

  const nested = payload.add_by_rss_resource_data;
  if (isAddByRssResourceDataLike(nested)) {
    return nested;
  }

  if (isAddByRssResourceDataLike(payload)) {
    return payload;
  }

  return undefined;
};

const mapLocalStateRow = (
  row: typeof schema.playbackLocalState.$inferSelect
): PlaybackLocalStateRecord | null => {
  if (!isPlaybackOutboxResourceKind(row.resourceKind)) {
    return null;
  }
  if (!isPlaybackZone(row.zone)) {
    return null;
  }
  return {
    accountIdText: row.accountIdText,
    queueIdText: row.queueIdText,
    resourceKind: row.resourceKind,
    resourceIdText: row.resourceIdText,
    playbackPosition: normalizePositiveNumber(row.playbackPosition),
    mediaFileDuration: row.mediaFileDuration ?? null,
    completed: row.completed === 1,
    zone: row.zone,
    lastMeaningfulAt: row.lastMeaningfulAt,
  };
};

const rowToLocalStateValue = (
  row: typeof schema.playbackLocalState.$inferSelect
): PlaybackLocalStateValue | null => {
  const mapped = mapLocalStateRow(row);
  if (mapped === null) {
    return null;
  }
  return {
    completed: mapped.completed,
    lastMeaningfulAt: mapped.lastMeaningfulAt,
    mediaFileDuration: mapped.mediaFileDuration,
    playbackPosition: mapped.playbackPosition,
    zone: mapped.zone,
  };
};

const NOW_PLAYING_EPSILON = 1e-21;

const normalizeNumericString = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePlaybackBoolean = (value: boolean | null | undefined): boolean => value === true;

const resolveRemotePlaybackZone = (listPosition: string): PlaybackZone => {
  const parsedPosition = normalizeNumericString(listPosition);
  if (parsedPosition === null) {
    return 'history';
  }
  if (parsedPosition > 0) {
    return 'upcoming';
  }
  if (parsedPosition >= -NOW_PLAYING_EPSILON && parsedPosition <= NOW_PLAYING_EPSILON) {
    return 'now_playing';
  }
  return 'history';
};

const resolveRemoteResourceRef = (
  resource: DTOQueueResource
): { resourceIdText: string; resourceKind: PlaybackOutboxResourceKind } | null => {
  const addByRssHashId = normalizeNonEmptyString(resource.add_by_rss_hash_id);
  if (addByRssHashId !== null) {
    return { resourceIdText: addByRssHashId, resourceKind: 'add_by_rss' };
  }

  const soundbiteIdText = normalizeNonEmptyString(resource.item_soundbite?.id_text);
  if (soundbiteIdText !== null) {
    return { resourceIdText: soundbiteIdText, resourceKind: 'soundbite' };
  }

  const clipIdText = normalizeNonEmptyString(resource.clip?.id_text);
  if (clipIdText !== null) {
    return { resourceIdText: clipIdText, resourceKind: 'clip' };
  }

  const itemIdText = normalizeNonEmptyString(resource.item?.id_text);
  if (itemIdText !== null) {
    return { resourceIdText: itemIdText, resourceKind: 'item' };
  }

  return null;
};

const toReconcileRemoteState = (
  queueIdText: string,
  resource: DTOQueueResource
): PlaybackReconcileResourceState | null => {
  const reference = resolveRemoteResourceRef(resource);
  if (reference === null) {
    return null;
  }

  return {
    queueIdText,
    resourceKind: reference.resourceKind,
    resourceIdText: reference.resourceIdText,
    playbackPosition: normalizePositiveNumber(normalizeNumericString(resource.playback_position)),
    mediaFileDuration: normalizeNumericString(resource.media_file_duration),
    completed: normalizePlaybackBoolean(resource.completed),
    zone: resolveRemotePlaybackZone(resource.list_position),
    lastMeaningfulAt: toEpochMsOrNull(resource.last_played_at),
  };
};

const toReconcileLocalState = (row: PlaybackLocalStateRecord): PlaybackReconcileResourceState => {
  return {
    queueIdText: row.queueIdText,
    resourceKind: row.resourceKind,
    resourceIdText: row.resourceIdText,
    playbackPosition: row.playbackPosition,
    mediaFileDuration: row.mediaFileDuration,
    completed: row.completed,
    zone: row.zone,
    lastMeaningfulAt: row.lastMeaningfulAt,
  };
};

const toReconcileOutboxEvent = (
  row: PlaybackOutboxRowShape
): PlaybackReconcileOutboxEvent | null => {
  if (!isPlaybackOutboxResourceKind(row.resourceKind) || !isPlaybackEventKind(row.eventKind)) {
    return null;
  }

  return {
    queueIdText: row.queueIdText,
    resourceKind: row.resourceKind,
    resourceIdText: row.resourceIdText,
    eventKind: row.eventKind,
    occurredAt: row.occurredAt,
    playbackPosition: row.playbackPosition,
    mediaFileDuration: row.mediaFileDuration,
    completed: row.completed === null ? null : row.completed === 1,
    payload: parsePayloadObject(row.payloadJson) ?? undefined,
  };
};

const reconcileStateKey = (
  state: Pick<PlaybackReconcileResourceState, 'queueIdText' | 'resourceIdText' | 'resourceKind'>
): string => `${state.queueIdText}::${state.resourceKind}::${state.resourceIdText}`;

const upsertPlaybackLocalStateRows = async (
  accountIdText: string,
  rows: readonly PlaybackReconcileResourceState[]
): Promise<void> => {
  if (rows.length === 0) {
    return;
  }

  await getDb().transaction(async (transaction) => {
    for (const row of rows) {
      if (
        row.lastMeaningfulAt === null ||
        row.queueIdText.length === 0 ||
        row.resourceIdText.length === 0
      ) {
        continue;
      }

      await transaction
        .insert(schema.playbackLocalState)
        .values({
          accountIdText,
          queueIdText: row.queueIdText,
          resourceKind: row.resourceKind,
          resourceIdText: row.resourceIdText,
          playbackPosition: normalizePositiveNumber(row.playbackPosition),
          mediaFileDuration: row.mediaFileDuration,
          completed: row.completed ? 1 : 0,
          zone: row.zone,
          lastMeaningfulAt: row.lastMeaningfulAt,
        })
        .onConflictDoUpdate({
          target: [
            schema.playbackLocalState.accountIdText,
            schema.playbackLocalState.queueIdText,
            schema.playbackLocalState.resourceKind,
            schema.playbackLocalState.resourceIdText,
          ],
          set: {
            playbackPosition: normalizePositiveNumber(row.playbackPosition),
            mediaFileDuration: row.mediaFileDuration,
            completed: row.completed ? 1 : 0,
            zone: row.zone,
            lastMeaningfulAt: row.lastMeaningfulAt,
          },
        });
    }
  });
};

const buildReplayPayloadFromPushAction = (
  action: PlaybackReconcilePushAction,
  offsetMs: number
): PlaybackReplayEventPayload | null => {
  const replayEvent: PlaybackReplayEventPayload = {
    playback_event_kind: action.eventKind,
    last_played_at: toReplayOccurredAtIso(
      action.occurredAt,
      action.applyClockOffset ? offsetMs : 0
    ),
    playback_position: action.playbackPosition,
    completed: action.completed,
  };
  if (action.mediaFileDuration !== null) {
    replayEvent.media_file_duration = action.mediaFileDuration;
  }

  if (action.resourceKind === 'item') {
    replayEvent.item_id_text = action.resourceIdText;
    return replayEvent;
  }
  if (action.resourceKind === 'clip') {
    replayEvent.clip_id_text = action.resourceIdText;
    return replayEvent;
  }
  if (action.resourceKind === 'soundbite') {
    replayEvent.item_soundbite_id_text = action.resourceIdText;
    return replayEvent;
  }
  if (action.resourceKind === 'add_by_rss') {
    replayEvent.add_by_rss_hash_id = action.resourceIdText;
    const addByRssResourceData = extractAddByRssResourceDataFromPayloadValue(action.payload);
    if (addByRssResourceData === null && action.eventKind !== 'queue_remove') {
      return null;
    }
    if (addByRssResourceData !== null) {
      replayEvent.add_by_rss_resource_data = addByRssResourceData;
    }
    return replayEvent;
  }
  return null;
};

const buildReplayEventPayload = (
  row: PlaybackOutboxRowShape,
  offsetMs: number
): PlaybackReplayEventPayload | null => {
  if (!isPlaybackEventKind(row.eventKind)) {
    return null;
  }

  const replayEvent: PlaybackReplayEventPayload = {
    playback_event_kind: row.eventKind,
    last_played_at: toReplayOccurredAtIso(row.occurredAt, offsetMs),
  };

  if (row.playbackPosition !== null) {
    replayEvent.playback_position = row.playbackPosition;
  }
  if (row.mediaFileDuration !== null) {
    replayEvent.media_file_duration = row.mediaFileDuration;
  }
  if (row.completed !== null) {
    replayEvent.completed = row.completed === 1;
  }

  if (row.resourceKind === 'item') {
    replayEvent.item_id_text = row.resourceIdText;
  } else if (row.resourceKind === 'clip') {
    replayEvent.clip_id_text = row.resourceIdText;
  } else if (row.resourceKind === 'soundbite') {
    replayEvent.item_soundbite_id_text = row.resourceIdText;
  } else if (row.resourceKind === 'add_by_rss') {
    replayEvent.add_by_rss_hash_id = row.resourceIdText;
    const resourceData = extractAddByRssResourceData(row);
    if (resourceData !== undefined) {
      replayEvent.add_by_rss_resource_data = resourceData;
    }
  } else {
    return null;
  }

  return replayEvent;
};

const toOccurredAtIso = (occurredAt: number): string => {
  const normalizedOccurredAt =
    Number.isFinite(occurredAt) && occurredAt > 0 ? Math.trunc(occurredAt) : Date.now();
  return new Date(normalizedOccurredAt).toISOString();
};

const toQueueExtraParams = (event: PlaybackOutboxEnqueueEvent): QueueExtraParams => {
  const params: QueueExtraParams = {
    last_played_at: toOccurredAtIso(event.occurredAt),
    playback_event_kind: event.eventKind,
  };

  if (event.playbackPosition !== null && event.playbackPosition !== undefined) {
    params.playback_position = normalizePositiveNumber(event.playbackPosition).toString();
  }
  if (event.mediaFileDuration !== null && event.mediaFileDuration !== undefined) {
    params.media_file_duration = normalizePositiveNumber(event.mediaFileDuration).toString();
  }
  if (event.completed !== null && event.completed !== undefined) {
    params.completed = event.completed;
  }

  return params;
};

const replayBufferedStats = async (
  context: MobileAuthRequestContext,
  rows: PlaybackOutboxRowShape[]
): Promise<void> => {
  const channelIds = new Set<string>();
  const clipIds = new Set<string>();
  const itemIds = new Set<string>();

  for (const row of rows) {
    const statsTargets = parseStatsReplayPayload(row.payloadJson);
    if (statsTargets === null) {
      continue;
    }
    if (statsTargets.channelIdText !== null) {
      channelIds.add(statsTargets.channelIdText);
    }
    if (statsTargets.clipIdText !== null) {
      clipIds.add(statsTargets.clipIdText);
    }
    if (statsTargets.itemIdText !== null) {
      itemIds.add(statsTargets.itemIdText);
    }
  }

  for (const channelIdText of channelIds) {
    await statsRepository.replayPlaybackStats(context, {
      channelIdText,
      clipIdText: null,
      itemIdText: null,
    });
  }
  for (const clipIdText of clipIds) {
    await statsRepository.replayPlaybackStats(context, {
      channelIdText: null,
      clipIdText,
      itemIdText: null,
    });
  }
  for (const itemIdText of itemIds) {
    await statsRepository.replayPlaybackStats(context, {
      channelIdText: null,
      clipIdText: null,
      itemIdText,
    });
  }
};

const replayOneQueueBatch = async (
  context: MobileAuthRequestContext,
  queueIdText: string,
  rows: PlaybackOutboxRowShape[]
): Promise<PlaybackOutboxDrainResult> => {
  const storedClockOffset = await readPlaybackClockOffsetMs();
  const offsetMs = storedClockOffset?.offsetMs ?? 0;

  const replayEvents = rows
    .flatMap((row) => {
      const payload = buildReplayEventPayload(row, offsetMs);
      return payload === null ? [] : [payload];
    })
    .sort((left, right) => {
      return Date.parse(left.last_played_at) - Date.parse(right.last_played_at);
    });

  if (replayEvents.length === 0) {
    await getDb()
      .delete(schema.playbackOutbox)
      .where(
        inArray(
          schema.playbackOutbox.id,
          rows.map((row) => row.id)
        )
      );
    return { deletedRows: rows.length, replayedEvents: 0 };
  }

  const response = await requestWithMobileAuthRefresh(context, async (api) =>
    api.apiRequestWithHeaders<PlaybackReplayResponse>({
      method: 'POST',
      path: `/queue/${encodeURIComponent(queueIdText)}/playback-events/replay`,
      data: { events: replayEvents },
    })
  );

  const measuredOffset = computeClockOffsetMs(readDateHeader(response.headers), Date.now());
  if (measuredOffset !== null) {
    await writePlaybackClockOffsetMs(measuredOffset);
  }

  await replayBufferedStats(context, rows);

  await getDb()
    .delete(schema.playbackOutbox)
    .where(
      inArray(
        schema.playbackOutbox.id,
        rows.map((row) => row.id)
      )
    );

  return { deletedRows: rows.length, replayedEvents: replayEvents.length };
};

const replayPlannedQueueActions = async (
  context: MobileAuthRequestContext,
  actions: readonly PlaybackReconcilePushAction[]
): Promise<number> => {
  if (actions.length === 0) {
    return 0;
  }

  const storedClockOffset = await readPlaybackClockOffsetMs();
  const offsetMs = storedClockOffset?.offsetMs ?? 0;
  const grouped = new Map<string, PlaybackReconcilePushAction[]>();

  for (const action of actions) {
    const existing = grouped.get(action.queueIdText);
    if (existing === undefined) {
      grouped.set(action.queueIdText, [action]);
    } else {
      existing.push(action);
    }
  }

  let replayedEvents = 0;
  for (const [queueIdText, queueActions] of grouped.entries()) {
    const replayEvents = queueActions
      .flatMap((action) => {
        const payload = buildReplayPayloadFromPushAction(action, offsetMs);
        return payload === null ? [] : [payload];
      })
      .sort((left, right) => {
        return Date.parse(left.last_played_at) - Date.parse(right.last_played_at);
      });

    if (replayEvents.length === 0) {
      continue;
    }

    const response = await requestWithMobileAuthRefresh(context, async (api) =>
      api.apiRequestWithHeaders<PlaybackReplayResponse>({
        method: 'POST',
        path: `/queue/${encodeURIComponent(queueIdText)}/playback-events/replay`,
        data: { events: replayEvents },
      })
    );
    replayedEvents += replayEvents.length;

    const measuredOffset = computeClockOffsetMs(readDateHeader(response.headers), Date.now());
    if (measuredOffset !== null) {
      await writePlaybackClockOffsetMs(measuredOffset);
    }
  }

  return replayedEvents;
};

const listOutboxRowsForAccount = async (
  accountIdText: string
): Promise<PlaybackOutboxRowShape[]> => {
  return getDb()
    .select()
    .from(schema.playbackOutbox)
    .where(eq(schema.playbackOutbox.accountIdText, accountIdText))
    .orderBy(asc(schema.playbackOutbox.id));
};

const fetchRemoteHistoryForQueue = async (
  context: MobileAuthRequestContext,
  queueIdText: string
): Promise<DTOQueueResource[]> => {
  const history: DTOQueueResource[] = [];
  let page = 1;

  while (true) {
    const response = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourcesGetHistoryByQueueIdTextPaginated(queueIdText, page)
    );
    history.push(...response.data);

    // A null count means the endpoint did not total the set; the empty-page check ends the walk.
    const total = response.meta.count;
    if (response.data.length === 0 || (total !== null && history.length >= total)) {
      break;
    }
    page += 1;
  }

  return history;
};

const fetchRemotePlaybackState = async (
  context: MobileAuthRequestContext
): Promise<{ queueIdTexts: string[]; remoteState: PlaybackReconcileResourceState[] }> => {
  const queues = await requestWithMobileAuthRefresh(context, async (api) =>
    api.reqQueueGetAllForAccountPrivate()
  );
  const queueIdTexts = queues.map((queue: DTOQueue) => queue.id_text);
  const remoteByKey = new Map<string, PlaybackReconcileResourceState>();

  for (const queueIdText of queueIdTexts) {
    const [nowPlaying, upcoming, history] = await Promise.all([
      requestWithMobileAuthRefresh(context, async (api) =>
        api.reqQueueResourcesGetNowPlayingByQueueIdText(queueIdText)
      ),
      requestWithMobileAuthRefresh(context, async (api) =>
        api.reqQueueResourcesGetAllUpcomingByQueueIdText(queueIdText)
      ),
      fetchRemoteHistoryForQueue(context, queueIdText),
    ]);

    if (nowPlaying !== null) {
      const mapped = toReconcileRemoteState(queueIdText, nowPlaying);
      if (mapped !== null) {
        remoteByKey.set(reconcileStateKey(mapped), mapped);
      }
    }
    for (const resource of upcoming) {
      const mapped = toReconcileRemoteState(queueIdText, resource);
      if (mapped !== null) {
        remoteByKey.set(reconcileStateKey(mapped), mapped);
      }
    }
    for (const resource of history) {
      const mapped = toReconcileRemoteState(queueIdText, resource);
      if (mapped !== null) {
        remoteByKey.set(reconcileStateKey(mapped), mapped);
      }
    }
  }

  return { queueIdTexts, remoteState: [...remoteByKey.values()] };
};

const maybeSerializePayload = (payload: unknown): string | null => {
  if (payload === undefined) {
    return null;
  }
  return JSON.stringify(payload);
};

/**
 * Durable playback outbox and signed-in local playback state for offline reconciliation.
 */
export const playbackOutboxRepository = {
  enqueue: async (event: PlaybackOutboxEnqueueEvent): Promise<boolean> => {
    if (!shouldEnqueuePlaybackEvent({ eventKind: event.eventKind, isPlaying: event.isPlaying })) {
      return false;
    }

    await initializeDatabase();

    await getDb().transaction(async (transaction) => {
      const occurredAt =
        Number.isFinite(event.occurredAt) && event.occurredAt > 0
          ? Math.trunc(event.occurredAt)
          : Date.now();

      const sameResourceTailRows = await transaction
        .select({ id: schema.playbackOutbox.id, eventKind: schema.playbackOutbox.eventKind })
        .from(schema.playbackOutbox)
        .where(
          and(
            eq(schema.playbackOutbox.accountIdText, event.accountIdText),
            eq(schema.playbackOutbox.queueIdText, event.queueIdText),
            eq(schema.playbackOutbox.resourceKind, event.resourceKind),
            eq(schema.playbackOutbox.resourceIdText, event.resourceIdText)
          )
        )
        .orderBy(desc(schema.playbackOutbox.id))
        .limit(1);

      const queueReorderTailRows =
        event.eventKind === 'queue_reorder'
          ? await transaction
              .select({ id: schema.playbackOutbox.id })
              .from(schema.playbackOutbox)
              .where(
                and(
                  eq(schema.playbackOutbox.accountIdText, event.accountIdText),
                  eq(schema.playbackOutbox.queueIdText, event.queueIdText),
                  eq(schema.playbackOutbox.eventKind, 'queue_reorder')
                )
              )
              .orderBy(desc(schema.playbackOutbox.id))
              .limit(1)
          : [];

      const sameResourceTail = sameResourceTailRows[0];
      const collapseToId =
        (shouldCollapseQueueReorderEvent(event.eventKind, queueReorderTailRows[0] !== undefined)
          ? queueReorderTailRows[0]?.id
          : undefined) ??
        (shouldCollapsePlaybackEvent({
          incomingEventKind: event.eventKind,
          sameResourceTailEventKind:
            sameResourceTail !== undefined && isPlaybackEventKind(sameResourceTail.eventKind)
              ? sameResourceTail.eventKind
              : null,
        })
          ? sameResourceTail?.id
          : undefined);

      const playbackPosition =
        event.playbackPosition === null || event.playbackPosition === undefined
          ? null
          : normalizePositiveNumber(event.playbackPosition);
      const mediaFileDuration =
        event.mediaFileDuration === null || event.mediaFileDuration === undefined
          ? null
          : normalizePositiveNumber(event.mediaFileDuration);
      const completed =
        event.completed === null || event.completed === undefined ? null : event.completed ? 1 : 0;

      const eventValues = {
        eventId: createUuid(),
        accountIdText: event.accountIdText,
        queueIdText: event.queueIdText,
        resourceKind: event.resourceKind,
        resourceIdText: event.resourceIdText,
        eventKind: event.eventKind,
        occurredAt,
        playbackPosition,
        mediaFileDuration,
        completed,
        payloadJson: maybeSerializePayload(event.payload),
      };

      if (collapseToId !== undefined) {
        await transaction
          .update(schema.playbackOutbox)
          .set(eventValues)
          .where(eq(schema.playbackOutbox.id, collapseToId));
      } else {
        await transaction.insert(schema.playbackOutbox).values(eventValues);
      }

      const existingStateRows = await transaction
        .select()
        .from(schema.playbackLocalState)
        .where(
          and(
            eq(schema.playbackLocalState.accountIdText, event.accountIdText),
            eq(schema.playbackLocalState.queueIdText, event.queueIdText),
            eq(schema.playbackLocalState.resourceKind, event.resourceKind),
            eq(schema.playbackLocalState.resourceIdText, event.resourceIdText)
          )
        )
        .limit(1);

      const incomingState = toPlaybackLocalStateValue({ ...event, occurredAt });
      const mergedState = mergePlaybackLocalState(
        existingStateRows[0] === undefined ? null : rowToLocalStateValue(existingStateRows[0]),
        incomingState
      );

      await transaction
        .insert(schema.playbackLocalState)
        .values({
          accountIdText: event.accountIdText,
          queueIdText: event.queueIdText,
          resourceKind: event.resourceKind,
          resourceIdText: event.resourceIdText,
          playbackPosition: mergedState.playbackPosition,
          mediaFileDuration: mergedState.mediaFileDuration,
          completed: mergedState.completed ? 1 : 0,
          zone: mergedState.zone,
          lastMeaningfulAt: mergedState.lastMeaningfulAt,
        })
        .onConflictDoUpdate({
          target: [
            schema.playbackLocalState.accountIdText,
            schema.playbackLocalState.queueIdText,
            schema.playbackLocalState.resourceKind,
            schema.playbackLocalState.resourceIdText,
          ],
          set: {
            playbackPosition: mergedState.playbackPosition,
            mediaFileDuration: mergedState.mediaFileDuration,
            completed: mergedState.completed ? 1 : 0,
            zone: mergedState.zone,
            lastMeaningfulAt: mergedState.lastMeaningfulAt,
          },
        });

      // A queue holds one now-playing resource: taking that spot sends the previous holder to
      // history with its saved position, which is what the server does when a resource is added to
      // now-playing. Local state has to follow, or an offline session leaves two rows claiming the
      // spot and the reconcile resolves the older one back into it.
      if (mergedState.zone === 'now_playing') {
        await transaction
          .update(schema.playbackLocalState)
          .set({ zone: 'history' })
          .where(
            and(
              eq(schema.playbackLocalState.accountIdText, event.accountIdText),
              eq(schema.playbackLocalState.queueIdText, event.queueIdText),
              eq(schema.playbackLocalState.zone, 'now_playing'),
              or(
                ne(schema.playbackLocalState.resourceKind, event.resourceKind),
                ne(schema.playbackLocalState.resourceIdText, event.resourceIdText)
              )
            )
          );
      }

      const candidates = await transaction
        .select({ id: schema.playbackOutbox.id, eventKind: schema.playbackOutbox.eventKind })
        .from(schema.playbackOutbox)
        .where(eq(schema.playbackOutbox.accountIdText, event.accountIdText));

      const evictIds = selectPlaybackOutboxEvictions(
        candidates.flatMap((candidate) =>
          isPlaybackEventKind(candidate.eventKind)
            ? [{ id: candidate.id, eventKind: candidate.eventKind }]
            : []
        )
      );

      if (evictIds.length > 0) {
        await transaction
          .delete(schema.playbackOutbox)
          .where(inArray(schema.playbackOutbox.id, evictIds));
      }
    });

    return true;
  },

  postNowPlayingEvent: async (
    context: MobileAuthRequestContext,
    event: PlaybackOutboxEnqueueEvent,
    options: { claimActiveQueue?: boolean } = {}
  ): Promise<boolean> => {
    const params = toQueueExtraParams(event);

    await requestWithMobileAuthRefresh(context, async (api) => {
      if (options.claimActiveQueue === true) {
        await api.reqQueueUpdateIsActiveQueue(event.queueIdText, true);
      }

      if (event.resourceKind === 'clip') {
        await api.reqQueueResourceClipAddNowPlaying(
          event.queueIdText,
          event.resourceIdText,
          params
        );
        return;
      }
      if (event.resourceKind === 'item') {
        await api.reqQueueResourceItemAddNowPlaying(
          event.queueIdText,
          event.resourceIdText,
          params
        );
        return;
      }
      if (event.resourceKind === 'soundbite') {
        await api.reqQueueResourceItemSoundbiteAddNowPlaying(
          event.queueIdText,
          event.resourceIdText,
          params
        );
        return;
      }

      const addByRssResourceData = extractAddByRssResourceDataFromPayloadValue(event.payload);
      if (addByRssResourceData === null) {
        return;
      }
      await api.reqQueueResourceItemAddByRSSAddNowPlaying(event.queueIdText, {
        ...params,
        add_by_rss_resource_data: addByRssResourceData,
      });
    });

    if (event.resourceKind !== 'add_by_rss') {
      return true;
    }

    return extractAddByRssResourceDataFromPayloadValue(event.payload) !== null;
  },

  drain: async (
    context: MobileAuthRequestContext,
    accountIdText: string
  ): Promise<PlaybackOutboxDrainResult> => {
    await initializeDatabase();

    let replayedEvents = 0;
    let deletedRows = 0;

    // Stops on the user's switch and on a network that is not working. Without the second, a 500-
    // event outbox grinds through every batch failing each one, at the moment the app can least
    // afford the work. Undelivered rows stay put; the next replay picks them up where this left off.
    while (!isEffectivelyOffline()) {
      const batchRows = await getDb()
        .select()
        .from(schema.playbackOutbox)
        .where(eq(schema.playbackOutbox.accountIdText, accountIdText))
        .orderBy(asc(schema.playbackOutbox.id))
        .limit(PLAYBACK_REPLAY_BATCH_LIMIT);

      if (batchRows.length === 0) {
        break;
      }

      const byQueue = new Map<string, PlaybackOutboxRowShape[]>();
      for (const row of batchRows) {
        const existing = byQueue.get(row.queueIdText);
        if (existing === undefined) {
          byQueue.set(row.queueIdText, [row]);
        } else {
          existing.push(row);
        }
      }

      for (const [queueIdText, rows] of byQueue.entries()) {
        if (isEffectivelyOffline()) {
          break;
        }
        const result = await replayOneQueueBatch(context, queueIdText, rows);
        replayedEvents += result.replayedEvents;
        deletedRows += result.deletedRows;
      }
    }

    return { deletedRows, replayedEvents };
  },

  drainAndReconcile: async (
    context: MobileAuthRequestContext,
    accountIdText: string,
    options: { isPlayingLocally?: boolean } = {}
  ): Promise<PlaybackOutboxReconcileResult> => {
    await initializeDatabase();

    const drained = await playbackOutboxRepository.drain(context, accountIdText);
    const [{ queueIdTexts, remoteState }, localStateRows, outboxRows] = await Promise.all([
      fetchRemotePlaybackState(context),
      playbackOutboxRepository.listLocalStateByAccount(accountIdText),
      listOutboxRowsForAccount(accountIdText),
    ]);

    const queueSet = new Set(queueIdTexts);
    const localState = localStateRows
      .filter((row) => queueSet.has(row.queueIdText))
      .map(toReconcileLocalState);
    const localOutboxEvents = outboxRows.flatMap((row) => {
      if (!queueSet.has(row.queueIdText)) {
        return [];
      }
      const mapped = toReconcileOutboxEvent(row);
      return mapped === null ? [] : [mapped];
    });

    const plan = planPlaybackReconcile({
      localOutboxEvents,
      localState,
      remoteState,
      isPlayingLocally: options.isPlayingLocally === true,
    });

    await upsertPlaybackLocalStateRows(accountIdText, plan.adopt);
    const pushedEvents = await replayPlannedQueueActions(context, plan.push);
    await queueRepository.refreshAfterPlaybackReconcile(context, queueIdTexts);

    const postApplyRemote = await fetchRemotePlaybackState(context);
    const invariantViolations = findNowPlayingInvariantViolations(postApplyRemote.remoteState);
    if (invariantViolations.length > 0) {
      throw new Error(
        `Now-playing playback timestamp invariant violated for queues: ${invariantViolations.join(', ')}`
      );
    }

    return {
      ...drained,
      adoptedRows: plan.adopt.length,
      adoptPositions: plan.adoptPositions,
      pushedEvents,
      resolveConflicts: plan.resolveConflicts,
    };
  },

  clearForSignOut: async (accountIdText: string): Promise<void> => {
    await initializeDatabase();
    await getDb().transaction(async (transaction) => {
      await transaction
        .delete(schema.playbackOutbox)
        .where(eq(schema.playbackOutbox.accountIdText, accountIdText));
      await transaction
        .delete(schema.playbackLocalState)
        .where(eq(schema.playbackLocalState.accountIdText, accountIdText));
    });
  },

  listLocalStateByAccount: async (accountIdText: string): Promise<PlaybackLocalStateRecord[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.playbackLocalState)
      .where(eq(schema.playbackLocalState.accountIdText, accountIdText))
      .orderBy(asc(schema.playbackLocalState.lastMeaningfulAt));

    return rows.flatMap((row) => {
      const mapped = mapLocalStateRow(row);
      return mapped === null ? [] : [mapped];
    });
  },

  getLocalStateForResource: async (params: {
    accountIdText: string;
    queueIdText: string;
    resourceKind: PlaybackOutboxResourceKind;
    resourceIdText: string;
  }): Promise<PlaybackLocalStateRecord | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.playbackLocalState)
      .where(
        and(
          eq(schema.playbackLocalState.accountIdText, params.accountIdText),
          eq(schema.playbackLocalState.queueIdText, params.queueIdText),
          eq(schema.playbackLocalState.resourceKind, params.resourceKind),
          eq(schema.playbackLocalState.resourceIdText, params.resourceIdText)
        )
      )
      .limit(1);

    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    return mapLocalStateRow(row);
  },

  eventKindEmitsRemovalTombstone,
};
