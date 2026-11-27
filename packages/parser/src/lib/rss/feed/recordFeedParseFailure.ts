import type { FeedParseFailureReason } from '@podverse/helpers';
import type { Feed, FeedLogService } from '@podverse/orm';

type RecordFeedParseFailureExtras = {
  last_http_status?: number | null;
  last_parse_failure_reason: FeedParseFailureReason;
};

const recordedFailures = new WeakSet<object>();

/** Marks an error whose feed_log row was already written for this worker run. */
export function markFeedParseFailureRecorded(error: unknown): void {
  if (typeof error === 'object' && error !== null) {
    recordedFailures.add(error);
  }
}

/** True when this error, or a cause up to three levels down, was already recorded. */
export function wasFeedParseFailureRecorded(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth <= 3; depth += 1) {
    if (typeof current === 'object' && current !== null && recordedFailures.has(current)) {
      return true;
    }
    if (typeof current !== 'object' || current === null || !Reflect.has(current, 'cause')) {
      return false;
    }
    const cause: unknown = Reflect.get(current, 'cause');
    if (cause === undefined || cause === current) {
      return false;
    }
    current = cause;
  }
  return false;
}

export async function recordFeedParseFailure(
  feed: Feed,
  feedLogService: FeedLogService,
  extras: RecordFeedParseFailureExtras
): Promise<void> {
  const feedLog = await feedLogService.get(feed);
  const consecutiveTruncationFailures =
    extras.last_parse_failure_reason === 'response_truncated'
      ? (feedLog?.consecutive_truncation_failures ?? 0) + 1
      : undefined;
  await feedLogService.update(feed, {
    ...extras,
    parse_errors: (feedLog?.parse_errors ?? 0) + 1,
    last_failed_parse_time: new Date(),
    ...(consecutiveTruncationFailures !== undefined
      ? { consecutive_truncation_failures: consecutiveTruncationFailures }
      : {}),
  });
}
