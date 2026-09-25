import { CHANNEL_SEEN_MARK_BATCH_LIMIT } from './channelSeen.js';

export const PLAYBACK_OUTBOX_MAX_EVENTS = 500;
export const PLAYBACK_POSITION_NETWORK_INTERVAL_MS = 15_000;
export const PLAYBACK_POSITION_LOCAL_INTERVAL_MS = 5_000;
/** Leading+trailing window for coalesce of rapid seek network posts. */
export const PLAYBACK_SEEK_NETWORK_COALESCE_MS = 1_000;
export const PLAYBACK_REPLAY_BATCH_LIMIT = CHANNEL_SEEN_MARK_BATCH_LIMIT;
