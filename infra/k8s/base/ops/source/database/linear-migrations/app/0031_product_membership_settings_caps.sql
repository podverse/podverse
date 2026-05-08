-- 0031 migration
-- Persist trial/premium Add-by-RSS and manual refresh caps on product_membership_settings (singleton).

ALTER TABLE product_membership_settings
  ADD COLUMN trial_max_add_by_rss_feeds INTEGER NOT NULL DEFAULT 10
    CHECK (trial_max_add_by_rss_feeds >= 0),
  ADD COLUMN trial_max_manual_refreshes_per_hour INTEGER NOT NULL DEFAULT 5
    CHECK (trial_max_manual_refreshes_per_hour >= 0),
  ADD COLUMN premium_max_add_by_rss_feeds INTEGER NOT NULL DEFAULT 100
    CHECK (premium_max_add_by_rss_feeds >= 0),
  ADD COLUMN premium_max_manual_refreshes_per_hour INTEGER NOT NULL DEFAULT 20
    CHECK (premium_max_manual_refreshes_per_hour >= 0);
