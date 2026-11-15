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
  'unknown',
] as const;

export type FeedParseFailureReason = (typeof FEED_PARSE_FAILURE_REASONS)[number];

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
