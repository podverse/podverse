-- 0026 migration
-- Prep for dropping superseded feed_flag_status FK columns: spam_permitted condition parity (01b mapping;
-- see migration CASE / condition parity),
-- align primary_block_reason for SpamPermitted feeds, reinforce condition/policy indexes.

INSERT INTO feed_condition_type (condition_key) VALUES ('spam_permitted')
ON CONFLICT (condition_key) DO NOTHING;

INSERT INTO feed_condition (feed_id, feed_condition_type_id, is_active, source, note)
SELECT
  f.id,
  fct.id,
  TRUE,
  'admin',
  'Backfilled from feed_flag_status SpamPermitted (spam permitted operator flag)'
FROM feed f
JOIN feed_condition_type fct ON fct.condition_key = 'spam_permitted'
WHERE f.feed_flag_status_id = 7
ON CONFLICT (feed_id, feed_condition_type_id)
DO UPDATE SET
  is_active = EXCLUDED.is_active,
  source = EXCLUDED.source,
  note = EXCLUDED.note;

UPDATE feed_policy fp
SET
  primary_block_reason = NULL,
  last_policy_refresh_at = NOW(),
  updated_at = NOW()
FROM feed f
WHERE fp.feed_id = f.id
  AND f.feed_flag_status_id = 7;

CREATE INDEX IF NOT EXISTS idx_feed_policy_primary_block_reason
  ON feed_policy(primary_block_reason)
  WHERE primary_block_reason IS NOT NULL;
