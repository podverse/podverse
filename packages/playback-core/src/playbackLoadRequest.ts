import type { PlaybackTarget } from './playbackTarget.js';

/**
 * Input shape for loading a `PlaybackTarget`. The playback policy composes the
 * pure helpers in this module to derive the final seek seconds, pause-at-time,
 * and side effects from one of these.
 *
 * `explicitPlaybackSeconds` — typically the anonymous-snapshot
 * `playback_position_seconds` or a queue resource's `playback_position`.
 * When present and valid (finite, non-negative) it wins over abridged
 * lookups.
 *
 * `mediaFileDurationHintSeconds` — caller-known duration for cases where
 * abridged data is absent but a duration is still available (e.g. an
 * `AddByRSSResourceData` payload that carries enclosure length). The
 * clamp logic uses this only when no abridged `d` is available.
 */
export type PlaybackLoadRequest = {
  target: PlaybackTarget;
  explicitPlaybackSeconds?: number;
  mediaFileDurationHintSeconds?: number;
};
