-- 0023: Hard break - remove trust-tier semantics from account membership status.
-- Runtime defaults now derive from membership tier + expiry, with override columns preserved.

ALTER TABLE account_membership_status
DROP CONSTRAINT account_membership_status_account_trust_tier_id_check;

ALTER TABLE account_membership_status
DROP COLUMN account_trust_tier_id;
