import {
  mergePlaybackState,
  resolveHandoffDecision,
  resolveZoneForEvent,
  toEpochMsOrNull,
} from '@podverse/helpers';
import type { PlaybackEventKind, PlaybackZone } from '@podverse/helpers/playbackEvents';

import type { PlaybackOutboxResourceKind } from './playbackOutbox';

export type PlaybackReconcileResourceState = {
  queueIdText: string;
  resourceKind: PlaybackOutboxResourceKind;
  resourceIdText: string;
  playbackPosition: number;
  mediaFileDuration: number | null;
  completed: boolean;
  zone: PlaybackZone;
  lastMeaningfulAt: number | null;
};

export type PlaybackReconcileOutboxEvent = {
  queueIdText: string;
  resourceKind: PlaybackOutboxResourceKind;
  resourceIdText: string;
  eventKind: PlaybackEventKind;
  occurredAt: number;
  playbackPosition?: number | null;
  mediaFileDuration?: number | null;
  completed?: boolean | null;
  payload?: unknown;
};

export type PlaybackReconcilePushAction = PlaybackReconcileResourceState & {
  eventKind: PlaybackEventKind;
  occurredAt: number;
  applyClockOffset: boolean;
  payload?: unknown;
};

export type PlaybackReconcileDifferentNowPlayingConflict = {
  queueIdText: string;
  local: PlaybackReconcileResourceState;
  remote: PlaybackReconcileResourceState;
  winner: PlaybackReconcileResourceState;
  loser: PlaybackReconcileResourceState;
  shouldPrompt: boolean;
};

export type PlaybackReconcilePlan = {
  adopt: PlaybackReconcileResourceState[];
  push: PlaybackReconcilePushAction[];
  resolveConflicts: PlaybackReconcileDifferentNowPlayingConflict[];
  resolved: PlaybackReconcileResourceState[];
};

export type PlaybackReconcilePlannerInput = {
  localOutboxEvents: readonly PlaybackReconcileOutboxEvent[];
  localState: readonly PlaybackReconcileResourceState[];
  remoteState: readonly PlaybackReconcileResourceState[];
  isPlayingLocally: boolean;
};

const normalizeTimestamp = (value: number | null | undefined): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return Math.trunc(value);
};

const normalizePlaybackNumber = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
};

const normalizeMediaDuration = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
};

const toIsoOrNull = (timestampMs: number | null): string | null => {
  if (timestampMs === null) {
    return null;
  }
  return new Date(timestampMs).toISOString();
};

const compareMeaningfulAt = (left: number | null, right: number | null): number => {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return -1;
  }
  if (right === null) {
    return 1;
  }
  if (left === right) {
    return 0;
  }
  return left > right ? 1 : -1;
};

const stateKey = (
  state: Pick<PlaybackReconcileResourceState, 'queueIdText' | 'resourceIdText' | 'resourceKind'>
): string => `${state.queueIdText}::${state.resourceKind}::${state.resourceIdText}`;

const eventKey = (
  event: Pick<PlaybackReconcileOutboxEvent, 'queueIdText' | 'resourceIdText' | 'resourceKind'>
): string => `${event.queueIdText}::${event.resourceKind}::${event.resourceIdText}`;

const sameResource = (
  left: Pick<PlaybackReconcileResourceState, 'queueIdText' | 'resourceIdText' | 'resourceKind'>,
  right: Pick<PlaybackReconcileResourceState, 'queueIdText' | 'resourceIdText' | 'resourceKind'>
): boolean => {
  return (
    left.queueIdText === right.queueIdText &&
    left.resourceKind === right.resourceKind &&
    left.resourceIdText === right.resourceIdText
  );
};

const normalizedState = (state: PlaybackReconcileResourceState): PlaybackReconcileResourceState => {
  return {
    queueIdText: state.queueIdText,
    resourceKind: state.resourceKind,
    resourceIdText: state.resourceIdText,
    playbackPosition: normalizePlaybackNumber(state.playbackPosition),
    mediaFileDuration: normalizeMediaDuration(state.mediaFileDuration),
    completed: state.completed === true,
    zone: state.zone,
    lastMeaningfulAt: normalizeTimestamp(state.lastMeaningfulAt),
  };
};

const stateFromOutboxEvent = (
  event: PlaybackReconcileOutboxEvent
): PlaybackReconcileResourceState => {
  return {
    queueIdText: event.queueIdText,
    resourceKind: event.resourceKind,
    resourceIdText: event.resourceIdText,
    playbackPosition: normalizePlaybackNumber(event.playbackPosition),
    mediaFileDuration: normalizeMediaDuration(event.mediaFileDuration),
    completed: event.completed === true,
    zone: resolveZoneForEvent(event.eventKind),
    lastMeaningfulAt: normalizeTimestamp(event.occurredAt),
  };
};

const mergeStatePair = (
  local: PlaybackReconcileResourceState,
  remote: PlaybackReconcileResourceState
): PlaybackReconcileResourceState => {
  const merged = mergePlaybackState(
    {
      completed: local.completed,
      lastPlayedAt: toIsoOrNull(local.lastMeaningfulAt),
      playbackPosition: local.playbackPosition,
      zone: local.zone,
    },
    {
      completed: remote.completed,
      lastPlayedAt: toIsoOrNull(remote.lastMeaningfulAt),
      playbackPosition: remote.playbackPosition,
      zone: remote.zone,
    }
  );

  const localWinsTimestamp =
    compareMeaningfulAt(local.lastMeaningfulAt, remote.lastMeaningfulAt) >= 0;
  const timestampWinner = localWinsTimestamp ? local : remote;
  const timestampLoser = localWinsTimestamp ? remote : local;
  const mergedTimestamp = toEpochMsOrNull(merged.lastPlayedAt);

  return {
    queueIdText: local.queueIdText,
    resourceKind: local.resourceKind,
    resourceIdText: local.resourceIdText,
    playbackPosition: normalizePlaybackNumber(merged.playbackPosition),
    mediaFileDuration: timestampWinner.mediaFileDuration ?? timestampLoser.mediaFileDuration,
    completed: merged.completed,
    zone: merged.zone,
    lastMeaningfulAt:
      normalizeTimestamp(mergedTimestamp) ??
      timestampWinner.lastMeaningfulAt ??
      timestampLoser.lastMeaningfulAt,
  };
};

const statesEqual = (
  left: PlaybackReconcileResourceState | undefined,
  right: PlaybackReconcileResourceState
): boolean => {
  if (left === undefined) {
    return false;
  }

  return (
    left.queueIdText === right.queueIdText &&
    left.resourceKind === right.resourceKind &&
    left.resourceIdText === right.resourceIdText &&
    left.zone === right.zone &&
    left.completed === right.completed &&
    left.playbackPosition === right.playbackPosition &&
    left.mediaFileDuration === right.mediaFileDuration &&
    left.lastMeaningfulAt === right.lastMeaningfulAt
  );
};

const compareStatesStable = (
  left: PlaybackReconcileResourceState,
  right: PlaybackReconcileResourceState
): number => {
  const queueCompare = left.queueIdText.localeCompare(right.queueIdText);
  if (queueCompare !== 0) {
    return queueCompare;
  }
  const timestampCompare = compareMeaningfulAt(left.lastMeaningfulAt, right.lastMeaningfulAt);
  if (timestampCompare !== 0) {
    return timestampCompare;
  }
  return stateKey(left).localeCompare(stateKey(right));
};

const isMoreRecentState = (
  candidate: PlaybackReconcileResourceState,
  current: PlaybackReconcileResourceState
): boolean => {
  const timestampCompare = compareMeaningfulAt(
    candidate.lastMeaningfulAt,
    current.lastMeaningfulAt
  );
  if (timestampCompare !== 0) {
    return timestampCompare > 0;
  }
  return stateKey(candidate) > stateKey(current);
};

const pickNewestState = (
  states: readonly PlaybackReconcileResourceState[]
): PlaybackReconcileResourceState | null => {
  let newest: PlaybackReconcileResourceState | null = null;
  for (const candidate of states) {
    if (newest === null || isMoreRecentState(candidate, newest)) {
      newest = candidate;
    }
  }
  return newest;
};

const fallbackEventKindForZone = (zone: PlaybackZone, completed: boolean): PlaybackEventKind => {
  if (zone === 'removed') {
    return 'queue_remove';
  }
  if (zone === 'upcoming') {
    return 'queue_add';
  }
  if (zone === 'history') {
    return completed ? 'complete' : 'skip';
  }
  return 'play';
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasAddByRssResourceDataPayload = (payload: unknown): boolean => {
  if (!isRecord(payload)) {
    return false;
  }

  const nested = payload.add_by_rss_resource_data;
  if (isRecord(nested)) {
    return typeof nested.feed_url === 'string' && nested.feed_url.length > 0;
  }

  return typeof payload.feed_url === 'string' && payload.feed_url.length > 0;
};

const normalizeNowPlayingRows = (
  resolvedByKey: Map<string, PlaybackReconcileResourceState>
): void => {
  const byQueue = new Map<string, PlaybackReconcileResourceState[]>();
  for (const state of resolvedByKey.values()) {
    const queueStates = byQueue.get(state.queueIdText);
    if (queueStates === undefined) {
      byQueue.set(state.queueIdText, [state]);
    } else {
      queueStates.push(state);
    }
  }

  for (const queueStates of byQueue.values()) {
    const nowPlayingRows = queueStates.filter((state) => state.zone === 'now_playing');
    if (nowPlayingRows.length <= 1) {
      continue;
    }

    const newest = pickNewestState(nowPlayingRows);
    if (newest === null) {
      continue;
    }

    const newestKey = stateKey(newest);
    for (const state of nowPlayingRows) {
      const key = stateKey(state);
      if (key === newestKey) {
        continue;
      }
      resolvedByKey.set(key, { ...state, zone: 'history' });
    }
  }
};

const readQueueNowPlaying = (
  statesByKey: ReadonlyMap<string, PlaybackReconcileResourceState>,
  queueIdText: string
): PlaybackReconcileResourceState | null => {
  const queueNowPlaying: PlaybackReconcileResourceState[] = [];
  for (const state of statesByKey.values()) {
    if (state.queueIdText === queueIdText && state.zone === 'now_playing') {
      queueNowPlaying.push(state);
    }
  }
  return pickNewestState(queueNowPlaying);
};

const shouldPushResolvedState = ({
  latestLocalEvent,
  remote,
  resolved,
}: {
  latestLocalEvent: PlaybackReconcileOutboxEvent | undefined;
  remote: PlaybackReconcileResourceState | undefined;
  resolved: PlaybackReconcileResourceState;
}): boolean => {
  if (remote === undefined) {
    if (resolved.zone === 'removed') {
      return false;
    }
    if (resolved.resourceKind === 'add_by_rss') {
      return hasAddByRssResourceDataPayload(latestLocalEvent?.payload);
    }
    return true;
  }

  return !statesEqual(remote, resolved);
};

const toPushAction = ({
  applyClockOffset,
  latestLocalEvent,
  resolved,
}: {
  applyClockOffset: boolean;
  latestLocalEvent: PlaybackReconcileOutboxEvent | undefined;
  resolved: PlaybackReconcileResourceState;
}): PlaybackReconcilePushAction => {
  const resolvedOccurredAt = resolved.lastMeaningfulAt ?? Date.now();
  const latestEventMatchesZone =
    latestLocalEvent !== undefined &&
    resolveZoneForEvent(latestLocalEvent.eventKind) === resolved.zone &&
    normalizeTimestamp(latestLocalEvent.occurredAt) === resolved.lastMeaningfulAt;

  return {
    ...resolved,
    eventKind: latestEventMatchesZone
      ? latestLocalEvent.eventKind
      : fallbackEventKindForZone(resolved.zone, resolved.completed),
    occurredAt: resolvedOccurredAt,
    applyClockOffset,
    payload: latestLocalEvent?.payload,
  };
};

/**
 * Different-item now-playing disagreements are data for the handoff prompt. This planner never
 * changes what is loaded in the engine.
 */
const collectDifferentNowPlayingConflicts = ({
  isPlayingLocally,
  localByKey,
  remoteByKey,
  resolvedByKey,
}: {
  isPlayingLocally: boolean;
  localByKey: ReadonlyMap<string, PlaybackReconcileResourceState>;
  remoteByKey: ReadonlyMap<string, PlaybackReconcileResourceState>;
  resolvedByKey: ReadonlyMap<string, PlaybackReconcileResourceState>;
}): PlaybackReconcileDifferentNowPlayingConflict[] => {
  const queueIds = new Set<string>();
  for (const state of localByKey.values()) {
    queueIds.add(state.queueIdText);
  }
  for (const state of remoteByKey.values()) {
    queueIds.add(state.queueIdText);
  }

  const conflicts: PlaybackReconcileDifferentNowPlayingConflict[] = [];
  for (const queueIdText of queueIds) {
    const localNowPlaying = readQueueNowPlaying(localByKey, queueIdText);
    const remoteNowPlaying = readQueueNowPlaying(remoteByKey, queueIdText);
    if (localNowPlaying === null || remoteNowPlaying === null) {
      continue;
    }
    if (sameResource(localNowPlaying, remoteNowPlaying)) {
      continue;
    }

    const resolvedNowPlaying = readQueueNowPlaying(resolvedByKey, queueIdText);
    if (resolvedNowPlaying === null) {
      continue;
    }

    const localResolved = resolvedByKey.get(stateKey(localNowPlaying)) ?? localNowPlaying;
    const remoteResolved = resolvedByKey.get(stateKey(remoteNowPlaying)) ?? remoteNowPlaying;
    const loser =
      sameResource(resolvedNowPlaying, localResolved) &&
      !sameResource(resolvedNowPlaying, remoteResolved)
        ? remoteResolved
        : localResolved;
    const handoffDecision = resolveHandoffDecision({
      localItemIdText: localResolved.resourceIdText,
      localLastPlayedAt: localResolved.lastMeaningfulAt,
      serverItemIdText: remoteResolved.resourceIdText,
      serverLastPlayedAt: remoteResolved.lastMeaningfulAt,
      isPlayingLocally,
    });

    conflicts.push({
      queueIdText,
      local: localResolved,
      remote: remoteResolved,
      winner: resolvedNowPlaying,
      loser,
      shouldPrompt: handoffDecision.kind === 'prompt',
    });
  }

  return conflicts.sort((left, right) => left.queueIdText.localeCompare(right.queueIdText));
};

export const planPlaybackReconcile = ({
  localOutboxEvents,
  localState,
  remoteState,
  isPlayingLocally,
}: PlaybackReconcilePlannerInput): PlaybackReconcilePlan => {
  const localByKey = new Map<string, PlaybackReconcileResourceState>();
  for (const state of localState) {
    const normalized = normalizedState(state);
    if (normalized.lastMeaningfulAt === null) {
      continue;
    }
    localByKey.set(stateKey(normalized), normalized);
  }

  const sortedLocalEvents = [...localOutboxEvents].sort(
    (left, right) => left.occurredAt - right.occurredAt
  );
  const latestLocalEventByKey = new Map<string, PlaybackReconcileOutboxEvent>();
  for (const event of sortedLocalEvents) {
    const eventState = stateFromOutboxEvent(event);
    if (eventState.lastMeaningfulAt === null) {
      continue;
    }

    const key = eventKey(event);
    const existing = localByKey.get(key);
    localByKey.set(key, existing === undefined ? eventState : mergeStatePair(existing, eventState));

    const latest = latestLocalEventByKey.get(key);
    if (latest === undefined || event.occurredAt >= latest.occurredAt) {
      latestLocalEventByKey.set(key, event);
    }
  }

  const remoteByKey = new Map<string, PlaybackReconcileResourceState>();
  for (const state of remoteState) {
    const normalized = normalizedState(state);
    remoteByKey.set(stateKey(normalized), normalized);
  }

  const allKeys = new Set<string>();
  for (const key of localByKey.keys()) {
    allKeys.add(key);
  }
  for (const key of remoteByKey.keys()) {
    allKeys.add(key);
  }

  const resolvedByKey = new Map<string, PlaybackReconcileResourceState>();
  for (const key of allKeys) {
    const local = localByKey.get(key);
    const remote = remoteByKey.get(key);
    const merged =
      local !== undefined && remote !== undefined
        ? mergeStatePair(local, remote)
        : local !== undefined
          ? local
          : remote;

    if (merged === undefined || merged.lastMeaningfulAt === null) {
      continue;
    }

    resolvedByKey.set(key, merged);
  }

  normalizeNowPlayingRows(resolvedByKey);
  const resolveConflicts = collectDifferentNowPlayingConflicts({
    isPlayingLocally,
    localByKey,
    remoteByKey,
    resolvedByKey,
  });

  const resolved = [...resolvedByKey.values()].sort(compareStatesStable);
  const adopt: PlaybackReconcileResourceState[] = [];
  const push: PlaybackReconcilePushAction[] = [];

  for (const state of resolved) {
    const key = stateKey(state);
    const local = localByKey.get(key);
    if (!statesEqual(local, state)) {
      adopt.push(state);
    }

    const remote = remoteByKey.get(key);
    const latestLocalEvent = latestLocalEventByKey.get(key);
    if (shouldPushResolvedState({ latestLocalEvent, remote, resolved: state })) {
      const applyClockOffset =
        remote === undefined ||
        (local !== undefined &&
          compareMeaningfulAt(local.lastMeaningfulAt, remote.lastMeaningfulAt) >= 0);
      push.push(toPushAction({ applyClockOffset, latestLocalEvent, resolved: state }));
    }
  }

  return { adopt, push, resolveConflicts, resolved };
};

export const findNowPlayingInvariantViolations = (
  states: readonly PlaybackReconcileResourceState[]
): string[] => {
  const byQueue = new Map<string, PlaybackReconcileResourceState[]>();
  for (const state of states) {
    const queueStates = byQueue.get(state.queueIdText);
    if (queueStates === undefined) {
      byQueue.set(state.queueIdText, [state]);
    } else {
      queueStates.push(state);
    }
  }

  const violatingQueueIds: string[] = [];
  for (const [queueIdText, queueStates] of byQueue.entries()) {
    const nonUpcoming = queueStates.filter(
      (state) => state.zone !== 'upcoming' && state.zone !== 'removed'
    );
    if (nonUpcoming.length === 0) {
      continue;
    }

    const nowPlayingRows = nonUpcoming.filter((state) => state.zone === 'now_playing');
    if (nowPlayingRows.length === 0) {
      continue;
    }
    if (nowPlayingRows.length > 1) {
      violatingQueueIds.push(queueIdText);
      continue;
    }

    const maxNonUpcoming = pickNewestState(nonUpcoming);
    const nowPlaying = nowPlayingRows[0];
    if (
      maxNonUpcoming !== null &&
      nowPlaying !== undefined &&
      compareMeaningfulAt(nowPlaying.lastMeaningfulAt, maxNonUpcoming.lastMeaningfulAt) < 0
    ) {
      violatingQueueIds.push(queueIdText);
    }
  }

  return violatingQueueIds.sort((left, right) => left.localeCompare(right));
};
