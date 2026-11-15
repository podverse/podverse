-- last_parse_failure_reason is why the latest recorded parse failed. A finished parse clears it.

ALTER TABLE public.feed_log
  ADD COLUMN last_parse_failure_reason text;

ALTER TABLE public.feed_log
  ADD CONSTRAINT feed_log_last_parse_failure_reason_check
  CHECK (
    last_parse_failure_reason IS NULL
    OR last_parse_failure_reason IN (
      'http_404', 'http_410', 'http_403', 'http_4xx', 'http_5xx', 'body_too_large',
      'dns_not_found', 'tls_error', 'timeout', 'connection_error', 'not_a_feed', 'no_feed_url',
      'db_value_out_of_range', 'db_error', 'parse_error', 'unknown'
    )
  );
