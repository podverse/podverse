-- Trial and Premium share one Add by RSS limit. A per-account override on account membership
-- status still wins over it. The manual-refresh caps stay per tier.

ALTER TABLE public.product_membership_settings
  ADD COLUMN max_add_by_rss_feeds integer;

UPDATE public.product_membership_settings
  SET max_add_by_rss_feeds = premium_max_add_by_rss_feeds;

ALTER TABLE public.product_membership_settings
  ALTER COLUMN max_add_by_rss_feeds SET DEFAULT 100,
  ALTER COLUMN max_add_by_rss_feeds SET NOT NULL,
  ADD CONSTRAINT product_membership_settings_max_add_by_rss_feeds_check
    CHECK ((max_add_by_rss_feeds >= 0));

ALTER TABLE public.product_membership_settings
  DROP COLUMN trial_max_add_by_rss_feeds,
  DROP COLUMN premium_max_add_by_rss_feeds;
