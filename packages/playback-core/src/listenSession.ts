import type { DTOClip } from '@podverse/helpers';
import { countedListenCapSeconds, isCountedListen } from '@podverse/helpers/popularityListen';

import { parsePlaybackSeconds } from './parsePlaybackSeconds.js';
import type { PlaybackTarget } from './playbackTarget.js';

/**
 * How a load affects the listener's counted-listen session: start a new one, keep the current one
 * (the same media moved to another file), or track nothing.
 */
export type ListenSessionDirective = 'start' | 'continue' | 'none';

/** What a session counts toward. A soundbite or chapter counts toward its item. */
export type ListenSessionTarget =
  | { kind: 'item'; idText: string; mediumId: number | null }
  | {
      kind: 'clip';
      idText: string;
      startSeconds: number;
      endSeconds: number | null;
      mediumId: number | null;
    };

/** One report for `POST /stats/listen`. */
export type ListenSessionReport = {
  target: ListenSessionTarget;
  /** One id per session; every report of the session repeats it. */
  clientListenId: string;
  /** Whole media seconds heard, from 0 to `LISTEN_SESSION_MAX_SECONDS_HEARD`. */
  secondsHeard: number;
  completed: boolean;
  /** Wall-clock time, in ms, at which the session first met the counted-listen rule. */
  countedAtMs: number;
  /** True for the session's first report. */
  firstReport: boolean;
  /** Length of the file the player loaded, or null when it has none yet. */
  mediaDurationSeconds: number | null;
};

export type ListenSessionTracker = {
  /** Apply a load's directive. Any session it replaces ends first. */
  load(input: {
    directive: ListenSessionDirective;
    target: ListenSessionTarget | null;
    mediaDurationSeconds: number | null;
  }): void;
  /** Media duration once the player knows it. */
  setMediaDuration(seconds: number): void;
  /** One position sample from the player. */
  recordPosition(input: {
    positionSeconds: number;
    isPlaying: boolean;
    playbackRate: number;
  }): void;
  /** The listener or the player moved the position; the next sample only sets a new baseline. */
  recordSeek(): void;
  /** Playback paused; sends an update when enough new listening built up. */
  recordPause(): void;
  /** The media played to its end; reports completion when the listen counted, then closes. */
  recordCompleted(): void;
  /** Close the session, sending an update when enough new listening built up. */
  end(): void;
  /** Drop the session without reporting (sign-out). */
  reset(): void;
};

/** Upper bound the listen route accepts for `seconds_heard`. */
export const LISTEN_SESSION_MAX_SECONDS_HEARD = 86_400;

/** Slack, in seconds, between a sample's position change and the wall-clock time it took. */
export const LISTEN_SESSION_TICK_TOLERANCE_SECONDS = 2;

/** New listening, in seconds, that earns an update report on pause or end. */
export const LISTEN_SESSION_UPDATE_STEP_SECONDS = 60;

type ListenSessionState = {
  target: ListenSessionTarget;
  clientListenId: string;
  mediaDurationSeconds: number | null;
  secondsHeard: number;
  lastPositionSeconds: number | null;
  lastSampleAtMs: number | null;
  completed: boolean;
  countedAtMs: number | null;
  lastReportedSeconds: number | null;
  reportedCompleted: boolean;
};

function channelMediumId(channel: { medium_id?: number | null }): number | null {
  return typeof channel.medium_id === 'number' ? channel.medium_id : null;
}

export function listenSessionTargetForClip(
  clip: Pick<DTOClip, 'id_text' | 'start_time' | 'end_time'>,
  mediumId: number | null = null
): ListenSessionTarget {
  const startSeconds = parsePlaybackSeconds(clip.start_time) ?? 0;
  const endSeconds = parsePlaybackSeconds(clip.end_time);
  return {
    kind: 'clip',
    idText: clip.id_text,
    startSeconds,
    endSeconds: endSeconds !== undefined && endSeconds > startSeconds ? endSeconds : null,
    mediumId,
  };
}

/** Session target for a playback target; `null` for media that is not counted. */
export function listenSessionTargetFromPlaybackTarget(
  target: PlaybackTarget
): ListenSessionTarget | null {
  switch (target.kind) {
    case 'clip':
      return listenSessionTargetForClip(target.clip, channelMediumId(target.channel));
    case 'soundbite':
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return {
        kind: 'item',
        idText: target.item.id_text,
        mediumId: channelMediumId(target.channel),
      };
    case 'add-by-rss':
    case 'livestream':
      return null;
  }
}

function positiveSecondsOrNull(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value > 0 ? value : null;
}

function sessionDurationSeconds(state: ListenSessionState): number | null {
  const { target, mediaDurationSeconds } = state;
  if (target.kind === 'item') {
    return mediaDurationSeconds;
  }
  if (target.endSeconds !== null) {
    return target.endSeconds - target.startSeconds;
  }
  if (mediaDurationSeconds !== null && mediaDurationSeconds > target.startSeconds) {
    return mediaDurationSeconds - target.startSeconds;
  }
  return null;
}

function wholeSecondsHeard(state: ListenSessionState): number {
  return Math.min(LISTEN_SESSION_MAX_SECONDS_HEARD, Math.floor(state.secondsHeard));
}

function isSameTarget(left: ListenSessionTarget, right: ListenSessionTarget): boolean {
  return left.kind === right.kind && left.idText === right.idText;
}

/**
 * Counts media seconds heard for one session at a time and decides when to report. A sample adds
 * its forward position change only while playing, and only when the change fits in the wall-clock
 * time since the previous sample at the playback rate, so seeks and source jumps add nothing.
 *
 * Reports go out when the session first meets the counted-listen rule, when it first reaches the
 * medium's cap after an earlier report below that cap (the server may know a different duration),
 * on completion, and on pause or end once 60 more seconds were heard since the last report. The
 * threshold is checked against whole seconds, the value the server receives.
 */
export function createListenSessionTracker(deps: {
  now: () => number;
  createClientListenId: () => string;
  onReport: (report: ListenSessionReport) => void;
}): ListenSessionTracker {
  let session: ListenSessionState | null = null;

  const emit = (state: ListenSessionState): void => {
    const firstReport = state.lastReportedSeconds === null;
    const secondsHeard = wholeSecondsHeard(state);
    state.lastReportedSeconds = secondsHeard;
    state.reportedCompleted = state.completed;
    try {
      deps.onReport({
        target: state.target,
        clientListenId: state.clientListenId,
        secondsHeard,
        completed: state.completed,
        countedAtMs: state.countedAtMs ?? deps.now(),
        firstReport,
        mediaDurationSeconds: state.mediaDurationSeconds,
      });
    } catch {
      // A failing reporter never interrupts playback.
    }
  };

  const maybeReport = (state: ListenSessionState, reason: 'progress' | 'pause' | 'end'): void => {
    const secondsHeard = wholeSecondsHeard(state);
    if (state.countedAtMs === null) {
      if (
        !isCountedListen({
          secondsHeard,
          durationSeconds: sessionDurationSeconds(state),
          mediumId: state.target.mediumId,
        })
      ) {
        return;
      }
      state.countedAtMs = deps.now();
      emit(state);
      return;
    }
    const lastReported = state.lastReportedSeconds ?? 0;
    if (state.completed && !state.reportedCompleted) {
      emit(state);
      return;
    }
    const cap = countedListenCapSeconds(state.target.mediumId);
    if (lastReported < cap && secondsHeard >= cap) {
      emit(state);
      return;
    }
    if (
      reason !== 'progress' &&
      secondsHeard >= lastReported + LISTEN_SESSION_UPDATE_STEP_SECONDS
    ) {
      emit(state);
    }
  };

  const closeSession = (): void => {
    if (session === null) {
      return;
    }
    const closing = session;
    session = null;
    maybeReport(closing, 'end');
  };

  const clearBaseline = (state: ListenSessionState): void => {
    state.lastPositionSeconds = null;
    state.lastSampleAtMs = null;
  };

  return {
    load({ directive, target, mediaDurationSeconds }) {
      if (
        directive === 'continue' &&
        session !== null &&
        target !== null &&
        isSameTarget(session.target, target)
      ) {
        const duration = positiveSecondsOrNull(mediaDurationSeconds);
        if (duration !== null) {
          session.mediaDurationSeconds = duration;
        }
        clearBaseline(session);
        return;
      }
      closeSession();
      if (directive === 'none' || target === null) {
        return;
      }
      session = {
        target,
        clientListenId: deps.createClientListenId(),
        mediaDurationSeconds: positiveSecondsOrNull(mediaDurationSeconds),
        secondsHeard: 0,
        lastPositionSeconds: null,
        lastSampleAtMs: null,
        completed: false,
        countedAtMs: null,
        lastReportedSeconds: null,
        reportedCompleted: false,
      };
    },

    setMediaDuration(seconds) {
      const duration = positiveSecondsOrNull(seconds);
      if (session !== null && duration !== null) {
        session.mediaDurationSeconds = duration;
      }
    },

    recordPosition({ positionSeconds, isPlaying, playbackRate }) {
      const state = session;
      if (state === null || !Number.isFinite(positionSeconds)) {
        return;
      }
      if (!isPlaying) {
        clearBaseline(state);
        return;
      }
      const nowMs = deps.now();
      if (state.lastPositionSeconds !== null && state.lastSampleAtMs !== null) {
        const delta = positionSeconds - state.lastPositionSeconds;
        const wallSeconds = Math.max(0, (nowMs - state.lastSampleAtMs) / 1000);
        const rate = Number.isFinite(playbackRate) && playbackRate > 1 ? playbackRate : 1;
        if (delta > 0 && delta <= wallSeconds * rate + LISTEN_SESSION_TICK_TOLERANCE_SECONDS) {
          state.secondsHeard = Math.min(
            LISTEN_SESSION_MAX_SECONDS_HEARD,
            state.secondsHeard + delta
          );
        }
      }
      state.lastPositionSeconds = positionSeconds;
      state.lastSampleAtMs = nowMs;

      if (
        state.target.kind === 'clip' &&
        state.target.endSeconds !== null &&
        positionSeconds >= state.target.endSeconds
      ) {
        state.completed = true;
        closeSession();
        return;
      }
      maybeReport(state, 'progress');
    },

    recordSeek() {
      if (session !== null) {
        clearBaseline(session);
      }
    },

    recordPause() {
      if (session === null) {
        return;
      }
      clearBaseline(session);
      maybeReport(session, 'pause');
    },

    recordCompleted() {
      if (session === null) {
        return;
      }
      session.completed = true;
      closeSession();
    },

    end() {
      closeSession();
    },

    reset() {
      session = null;
    },
  };
}
