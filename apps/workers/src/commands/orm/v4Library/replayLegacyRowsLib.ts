import type { EpisodeDecision, PendingRowKind, PendingRowStatus } from './copyAccountLibraryLib.js';

/** Subscriptions stay as the copy recorded them; the replay reads every other kind. */
export type ReplayRowKind = Exclude<PendingRowKind, 'subscription'>;

/**
 * Order the replay works through one account's rows. A clip is written before a playlist
 * member that points at it.
 */
export const REPLAY_ROW_KINDS: readonly ReplayRowKind[] = [
  'follow_account',
  'snapshot_clip',
  'playlist_clip',
  'snapshot_playlist_member',
  'now_playing',
  'queue',
  'history',
];

export function isReplayRowKind(value: unknown): value is ReplayRowKind {
  return REPLAY_ROW_KINDS.some((kind) => kind === value);
}

export function isPendingRowStatus(value: unknown): value is PendingRowStatus {
  return value === 'unresolved' || value === 'resolved' || value === 'dropped';
}

/** What the replay does with one row. `write` means the caller inserts or attaches. */
export type ReplayAction = 'write' | 'keep' | 'resolve' | 'drop';

export type ReplayDecision = { action: ReplayAction; reason: string };

/** Final status and reason for one row. */
export type ReplayResult = { status: PendingRowStatus; reason: string; outcome: string };

export function contextText(context: Record<string, unknown>, key: string): string | null {
  const value = context[key];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function contextNumber(context: Record<string, unknown>, key: string): number | null {
  const value = context[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function contextFlag(context: Record<string, unknown>, key: string): boolean {
  return context[key] === true;
}

/** A follow waits until the followed account is copied. */
export function decideFollow(input: { followedExists: boolean; isSelf: boolean }): ReplayDecision {
  if (input.isSelf) {
    return { action: 'resolve', reason: 'self' };
  }
  if (input.followedExists) {
    return { action: 'write', reason: 'replayed' };
  }
  return { action: 'keep', reason: 'account_not_copied' };
}

/**
 * Another user's clip in a playlist waits until that user's copy writes the clip. Never
 * dropped: a playlist the owner deleted ends the row as resolved.
 */
export function decidePlaylistClip(input: {
  playlistExists: boolean;
  clipExists: boolean;
  alreadyMember: boolean;
}): ReplayDecision {
  if (!input.playlistExists) {
    return { action: 'resolve', reason: 'playlist_removed' };
  }
  if (input.alreadyMember) {
    return { action: 'resolve', reason: 'already_in_playlist' };
  }
  if (input.clipExists) {
    return { action: 'write', reason: 'replayed' };
  }
  return { action: 'keep', reason: 'owner_not_copied' };
}

/**
 * Queue, history, and now playing from the copy's Active-item check. `dropped` is returned
 * there only once the feed is settled, so an unsettled feed keeps waiting.
 */
export function decidePlayback(
  outcome: { active: true } | { active: false; status: PendingRowStatus; reason: string }
): ReplayDecision {
  if (outcome.active) {
    return { action: 'write', reason: 'replayed' };
  }
  if (outcome.status === 'dropped') {
    return { action: 'drop', reason: outcome.reason };
  }
  return { action: 'keep', reason: outcome.reason };
}

/**
 * A clip or playlist member the copy saved as a snapshot. It reattaches once its show is
 * local and the episode matches an item, or once the feed parse has finished or failed and
 * the episode can be kept as an Archived item. Never dropped.
 */
export function decideSnapshotReattach(decision: EpisodeDecision): 'attach' | 'archive' | 'keep' {
  switch (decision) {
    case 'resolved':
      return 'attach';
    case 'archive':
      return 'archive';
    case 'waiting':
    case 'gone':
      return 'keep';
  }
}

/**
 * A clip or playlist member the copy could not write because its feed had not been parsed.
 * Once the parse finished or failed it is written with the copy's own rules: attached,
 * archived, or saved as a snapshot. Never dropped.
 */
export function decideWaitingSnapshot(decision: EpisodeDecision): 'write' | 'keep' {
  return decision === 'waiting' ? 'keep' : 'write';
}

export type PlaybackZone = 'now' | 'upcoming' | 'history';

export function playbackZoneOf(kind: 'now_playing' | 'queue' | 'history'): PlaybackZone {
  switch (kind) {
    case 'now_playing':
      return 'now';
    case 'queue':
      return 'upcoming';
    case 'history':
      return 'history';
  }
}

/** `queue_resource.list_position`: now playing is 0, upcoming is above, history below. */
export function zoneOfListPosition(position: string): PlaybackZone {
  const value = Number(position);
  if (value === 0) {
    return 'now';
  }
  return value > 0 ? 'upcoming' : 'history';
}

/**
 * A queue holds one row per item and per clip. Now playing outranks the upcoming queue, which
 * outranks history; between two history rows the newer play wins.
 */
export function replayedPlaybackWins(
  replayed: { zone: PlaybackZone; playedAt: string | null },
  existing: { zone: PlaybackZone; playedAt: string | null }
): boolean {
  const rank: Record<PlaybackZone, number> = { history: 1, upcoming: 2, now: 3 };
  if (rank[replayed.zone] !== rank[existing.zone]) {
    return rank[replayed.zone] > rank[existing.zone];
  }
  if (replayed.zone !== 'history') {
    return false;
  }
  const replayedTime = Date.parse(replayed.playedAt ?? '');
  const existingTime = Date.parse(existing.playedAt ?? '');
  if (Number.isNaN(replayedTime)) {
    return false;
  }
  return Number.isNaN(existingTime) || replayedTime > existingTime;
}

export function resultFor(decision: ReplayDecision, current: PendingRowStatus): ReplayResult {
  switch (decision.action) {
    case 'write':
    case 'resolve':
      return {
        status: 'resolved',
        reason: decision.reason,
        outcome: decision.action === 'write' ? 'written' : 'resolved',
      };
    case 'drop':
      return { status: 'dropped', reason: decision.reason, outcome: 'dropped' };
    case 'keep':
      return { status: current, reason: decision.reason, outcome: 'kept' };
  }
}

/** Counts per kind and outcome, for the log. */
export type ReplayCounts = Record<string, Record<string, number>>;

export function tallyReplay(counts: ReplayCounts, kind: string, outcome: string): void {
  const byOutcome = counts[kind] ?? {};
  byOutcome[outcome] = (byOutcome[outcome] ?? 0) + 1;
  counts[kind] = byOutcome;
}
