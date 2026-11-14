import type { FeedParseFailureReason } from '@podverse/helpers';
import type { Feed, FeedLogService } from '@podverse/orm';

type RecordFeedParseFailureExtras = {
  last_http_status?: number | null;
  last_parse_failure_reason: FeedParseFailureReason;
};

export async function recordFeedParseFailure(
  feed: Feed,
  feedLogService: FeedLogService,
  extras: RecordFeedParseFailureExtras
): Promise<void> {
  const feedLog = await feedLogService.get(feed);
  await feedLogService.update(feed, {
    ...extras,
    parse_errors: (feedLog?.parse_errors ?? 0) + 1,
    last_failed_parse_time: new Date(),
  });
}
