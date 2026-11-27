import { FIFTEEN_MINUTES_MS, ONE_DAY_MS, ONE_HOUR_MS } from '../timeConstants.js';
import type { FeedParseFailureReason } from './feedParseFailureReason.js';

/** A downloaded body at least this large, with no closing feed tag, ended early. */
export const RSS_CUT_OFF_MIN_BYTES = 100_000;

/** Downloads inside one parse before the failure is recorded. */
export const TRUNCATION_FETCH_ATTEMPTS = 3;

/** Delay before the second download, then before the third. */
export const TRUNCATION_FETCH_DELAYS_MS = [2_000, 8_000] as const;

const TRUNCATION_WAIT_AFTER_THREE_RUNS_MS = 6 * ONE_HOUR_MS;

export type TruncationBackoffInput = {
  reason: FeedParseFailureReason | null;
  lastFailedAt: Date | null;
  consecutiveFailures: number;
  now: Date;
};

export type AllowlistParseSnapshot = {
  lastFinishedParseTime: Date | null;
  lastFailedAt: Date | null;
  reason: FeedParseFailureReason | null;
  consecutiveTruncationFailures: number;
};

/**
 * Wait after 1, 2, 3, and 4 or more recorded cut-off runs.
 * A count of 0 uses the first step so a row written before the counter existed still waits.
 */
export function truncationWaitMs(consecutiveFailures: number): number {
  if (consecutiveFailures <= 1) {
    return FIFTEEN_MINUTES_MS;
  }
  if (consecutiveFailures === 2) {
    return ONE_HOUR_MS;
  }
  if (consecutiveFailures === 3) {
    return TRUNCATION_WAIT_AFTER_THREE_RUNS_MS;
  }
  return ONE_DAY_MS;
}

/** A forced reparse and a signed-in on-demand refresh skip the wait between cut-off downloads. */
export function automaticParseBypassesTruncationWait(options: {
  forceParse: boolean;
  onDemandAccountId: number | null;
}): boolean {
  if (options.forceParse) {
    return true;
  }
  return typeof options.onDemandAccountId === 'number' && options.onDemandAccountId > 0;
}

/** Milliseconds until another automatic parse may download this feed. Zero means it may run now. */
export function truncationBackoffRemainingMs(input: TruncationBackoffInput): number {
  if (input.reason !== 'response_truncated' || input.lastFailedAt === null) {
    return 0;
  }
  const elapsed = input.now.getTime() - input.lastFailedAt.getTime();
  const remaining = truncationWaitMs(input.consecutiveFailures) - elapsed;
  return remaining > 0 ? remaining : 0;
}

/**
 * True when the body is large and has no closing channel, rss, or feed tag.
 * A short error page stays a normal parse failure.
 */
export function rssBodyLooksCutOff(body: string): boolean {
  if (Buffer.byteLength(body, 'utf8') < RSS_CUT_OFF_MIN_BYTES) {
    return false;
  }
  const lower = body.toLowerCase();
  return !lower.includes('</channel>') && !lower.includes('</rss>') && !lower.includes('</feed>');
}

/**
 * A listed feed with a row stays out of the allowlist add queue when a parse has finished,
 * or a cut-off download is still inside its wait.
 */
export function allowlistFeedCountsAsStored(snapshot: AllowlistParseSnapshot, now: Date): boolean {
  if (snapshot.lastFinishedParseTime !== null) {
    return true;
  }
  return (
    truncationBackoffRemainingMs({
      reason: snapshot.reason,
      lastFailedAt: snapshot.lastFailedAt,
      consecutiveFailures: snapshot.consecutiveTruncationFailures,
      now,
    }) > 0
  );
}
