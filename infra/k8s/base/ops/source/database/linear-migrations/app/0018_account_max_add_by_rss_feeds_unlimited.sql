-- max_add_by_rss_feeds stores a cap, or -1 when the account is unlimited.
-- Null remains the shared default, and 0 remains a cap of zero.

ALTER TABLE public.account_membership_status
  DROP CONSTRAINT account_membership_status_max_add_by_rss_feeds_check;

ALTER TABLE public.account_membership_status
  ADD CONSTRAINT account_membership_status_max_add_by_rss_feeds_check
  CHECK (
    max_add_by_rss_feeds IS NULL
    OR max_add_by_rss_feeds >= -1
  );
