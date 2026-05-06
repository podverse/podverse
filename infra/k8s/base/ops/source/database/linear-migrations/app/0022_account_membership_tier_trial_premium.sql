-- 0022: hard-break membership tier naming to trial/premium.
-- Canonical values are now `trial` and `premium`.

ALTER TABLE account_membership DROP CONSTRAINT account_membership_tier_check;

UPDATE account_membership
SET tier = 'premium'
WHERE tier = 'basic';

ALTER TABLE account_membership
ADD CONSTRAINT account_membership_tier_check
CHECK (tier IN ('trial', 'premium'));
