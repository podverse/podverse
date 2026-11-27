/** Closed list stored on `feed_log.last_parse_failure_reason`. A finished parse stores null. */
export const FEED_PARSE_FAILURE_REASONS = [
  'http_404',
  'http_410',
  'http_403',
  'http_4xx',
  'http_5xx',
  'body_too_large',
  'dns_not_found',
  'tls_error',
  'timeout',
  'connection_error',
  'not_a_feed',
  'no_feed_url',
  'db_value_out_of_range',
  'db_error',
  'parse_error',
  'response_truncated',
  'unknown',
] as const;

export type FeedParseFailureReason = (typeof FEED_PARSE_FAILURE_REASONS)[number];

/** A stored reason string, or null when the value is missing or not in the closed list. */
export function parseFeedParseFailureReason(value: unknown): FeedParseFailureReason | null {
  if (typeof value !== 'string') {
    return null;
  }
  for (const reason of FEED_PARSE_FAILURE_REASONS) {
    if (reason === value) {
      return reason;
    }
  }
  return null;
}

/** True for a failure that another fetch of the same URL will not repair. */
export function isPermanentFeedParseFailure(reason: FeedParseFailureReason | null): boolean {
  return (
    reason === 'http_404' ||
    reason === 'http_410' ||
    reason === 'dns_not_found' ||
    reason === 'not_a_feed' ||
    reason === 'no_feed_url'
  );
}
