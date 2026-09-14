import type { PlaybackEventKind, PlaybackZone } from '@podverse/helpers/playbackEvents';
import { isMeaningfulPlaybackEvent, resolveZoneForEvent } from '@podverse/helpers/playbackEvents';
import { PLAYBACK_OUTBOX_MAX_EVENTS } from '@podverse/helpers/playbackOutboxLimits';
import { applyClockOffset } from '@podverse/helpers/playbackTimestamps';

export const PLAYBACK_OUTBOX_RESOURCE_KINDS = ['add_by_rss', 'clip', 'item', 'soundbite'] as const;

export type PlaybackOutboxResourceKind = (typeof PLAYBACK_OUTBOX_RESOURCE_KINDS)[number];

export const PLAYBACK_POSITION_ONLY_EVENT_KINDS = ['pause', 'progress_tick', 'seek'] as const;

export type PlaybackPositionOnlyEventKind = (typeof PLAYBACK_POSITION_ONLY_EVENT_KINDS)[number];

export type PlaybackOutboxEnqueueEvent = {
  accountIdText: string;
  queueIdText: string;
  resourceKind: PlaybackOutboxResourceKind;
  resourceIdText: string;
  eventKind: PlaybackEventKind;
  occurredAt: number;
  isPlaying: boolean;
  playbackPosition?: number | null;
  mediaFileDuration?: number | null;
  completed?: boolean | null;
  payload?: unknown;
};

export type PlaybackLocalStateValue = {
  completed: boolean;
  lastMeaningfulAt: number;
  mediaFileDuration: number | null;
  playbackPosition: number;
  zone: PlaybackZone;
};

export type PlaybackOutboxEvictionCandidate = {
  id: number;
  eventKind: PlaybackEventKind;
};

const normalizePlaybackNumber = (value: number | null | undefined): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
};

export const isPositionOnlyPlaybackEvent = (
  kind: PlaybackEventKind
): kind is PlaybackPositionOnlyEventKind => {
  return kind === 'pause' || kind === 'progress_tick' || kind === 'seek';
};

export const shouldEnqueuePlaybackEvent = ({
  eventKind,
  isPlaying,
}: Pick<PlaybackOutboxEnqueueEvent, 'eventKind' | 'isPlaying'>): boolean => {
  return isMeaningfulPlaybackEvent(eventKind, { isPlaying });
};

export const shouldCollapsePlaybackEvent = ({
  incomingEventKind,
  sameResourceTailEventKind,
}: {
  incomingEventKind: PlaybackEventKind;
  sameResourceTailEventKind: PlaybackEventKind | null;
}): boolean => {
  if (sameResourceTailEventKind === null) {
    return false;
  }
  return (
    isPositionOnlyPlaybackEvent(incomingEventKind) &&
    isPositionOnlyPlaybackEvent(sameResourceTailEventKind)
  );
};

export const shouldCollapseQueueReorderEvent = (
  incomingEventKind: PlaybackEventKind,
  hasQueueReorderTail: boolean
): boolean => {
  return incomingEventKind === 'queue_reorder' && hasQueueReorderTail;
};

const compareOldestFirst = (
  left: PlaybackOutboxEvictionCandidate,
  right: PlaybackOutboxEvictionCandidate
): number => {
  return left.id - right.id;
};

export const selectPlaybackOutboxEvictions = (
  candidates: readonly PlaybackOutboxEvictionCandidate[],
  cap: number = PLAYBACK_OUTBOX_MAX_EVENTS
): number[] => {
  const overflow = candidates.length - cap;
  if (overflow <= 0) {
    return [];
  }

  const positionOnly = candidates
    .filter((candidate) => isPositionOnlyPlaybackEvent(candidate.eventKind))
    .sort(compareOldestFirst);

  if (positionOnly.length >= overflow) {
    return positionOnly.slice(0, overflow).map((candidate) => candidate.id);
  }

  const remaining = candidates
    .filter((candidate) => !isPositionOnlyPlaybackEvent(candidate.eventKind))
    .sort(compareOldestFirst);

  return [...positionOnly, ...remaining.slice(0, overflow - positionOnly.length)].map(
    (candidate) => candidate.id
  );
};

export const toPlaybackLocalStateValue = (
  event: Pick<
    PlaybackOutboxEnqueueEvent,
    'completed' | 'eventKind' | 'mediaFileDuration' | 'occurredAt' | 'playbackPosition'
  >
): PlaybackLocalStateValue => ({
  completed: event.completed === true,
  lastMeaningfulAt: event.occurredAt,
  mediaFileDuration: event.mediaFileDuration ?? null,
  playbackPosition: normalizePlaybackNumber(event.playbackPosition),
  zone: resolveZoneForEvent(event.eventKind),
});

export const mergePlaybackLocalState = (
  existing: PlaybackLocalStateValue | null,
  incoming: PlaybackLocalStateValue
): PlaybackLocalStateValue => {
  if (existing === null) {
    return incoming;
  }

  const incomingWins = incoming.lastMeaningfulAt >= existing.lastMeaningfulAt;
  return {
    completed: existing.completed || incoming.completed,
    lastMeaningfulAt: incomingWins ? incoming.lastMeaningfulAt : existing.lastMeaningfulAt,
    mediaFileDuration: incoming.mediaFileDuration ?? existing.mediaFileDuration,
    playbackPosition: Math.max(existing.playbackPosition, incoming.playbackPosition),
    zone: incomingWins ? incoming.zone : existing.zone,
  };
};

export const eventKindEmitsRemovalTombstone = (kind: PlaybackEventKind): boolean => {
  return resolveZoneForEvent(kind) === 'removed';
};

export const toReplayOccurredAtIso = (occurredAt: number, offsetMs: number): string => {
  return new Date(applyClockOffset(occurredAt, offsetMs)).toISOString();
};
