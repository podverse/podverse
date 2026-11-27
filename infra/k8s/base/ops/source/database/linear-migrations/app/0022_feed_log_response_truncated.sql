-- A cut-off download is response_truncated. consecutive_truncation_failures counts
-- those worker runs. A finished parse sets the count back to 0.

ALTER TABLE public.feed_log
  ADD COLUMN consecutive_truncation_failures integer NOT NULL DEFAULT 0;

ALTER TABLE public.feed_log
  DROP CONSTRAINT feed_log_last_parse_failure_reason_check;

ALTER TABLE public.feed_log
  ADD CONSTRAINT feed_log_last_parse_failure_reason_check
  CHECK (
    last_parse_failure_reason IS NULL
    OR last_parse_failure_reason IN (
      'http_404', 'http_410', 'http_403', 'http_4xx', 'http_5xx', 'body_too_large',
      'dns_not_found', 'tls_error', 'timeout', 'connection_error', 'not_a_feed', 'no_feed_url',
      'db_value_out_of_range', 'db_error', 'parse_error', 'response_truncated', 'unknown'
    )
  );
