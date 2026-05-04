-- 0021: Add trust-tier and per-account entitlement override fields.

ALTER TABLE account_membership_status
ADD COLUMN IF NOT EXISTS account_trust_tier_id integer NOT NULL DEFAULT 1;

ALTER TABLE account_membership_status
ADD COLUMN IF NOT EXISTS allow_directory_add_by_rss boolean NULL;

ALTER TABLE account_membership_status
ADD COLUMN IF NOT EXISTS max_add_by_rss_feeds integer NULL;

ALTER TABLE account_membership_status
ADD COLUMN IF NOT EXISTS max_manual_refreshes_per_hour integer NULL;

ALTER TABLE account_membership_status
ADD COLUMN IF NOT EXISTS track_stats boolean NULL;

ALTER TABLE account_membership_status
ADD COLUMN IF NOT EXISTS allow_notifications boolean NULL;

ALTER TABLE account_membership_status
DROP CONSTRAINT IF EXISTS account_membership_status_account_trust_tier_id_check;

ALTER TABLE account_membership_status
ADD CONSTRAINT account_membership_status_account_trust_tier_id_check
CHECK (account_trust_tier_id IN (1, 2));

ALTER TABLE account_membership_status
DROP CONSTRAINT IF EXISTS account_membership_status_max_add_by_rss_feeds_check;

ALTER TABLE account_membership_status
ADD CONSTRAINT account_membership_status_max_add_by_rss_feeds_check
CHECK (max_add_by_rss_feeds IS NULL OR max_add_by_rss_feeds >= 0);

ALTER TABLE account_membership_status
DROP CONSTRAINT IF EXISTS account_membership_status_max_manual_refreshes_per_hour_check;

ALTER TABLE account_membership_status
ADD CONSTRAINT account_membership_status_max_manual_refreshes_per_hour_check
CHECK (max_manual_refreshes_per_hour IS NULL OR max_manual_refreshes_per_hour >= 0);

UPDATE account_membership_status
SET account_trust_tier_id = CASE
  WHEN account_membership_id = 2 THEN 2
  ELSE 1
END
WHERE account_trust_tier_id IS NULL OR account_trust_tier_id NOT IN (1, 2);
