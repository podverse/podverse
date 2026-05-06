-- 0024 migration
-- Split feed moderation state into conditions + effective policy.

ALTER TABLE feed
ADD COLUMN IF NOT EXISTS max_response_body_bytes_override integer NULL;

ALTER TABLE feed
DROP CONSTRAINT IF EXISTS feed_max_response_body_bytes_override_positive_check;

ALTER TABLE feed
ADD CONSTRAINT feed_max_response_body_bytes_override_positive_check
CHECK (
  max_response_body_bytes_override IS NULL OR max_response_body_bytes_override > 0
);

CREATE TABLE IF NOT EXISTS feed_condition_type (
  id SERIAL PRIMARY KEY,
  condition_key VARCHAR(64) UNIQUE NOT NULL,
  created_at server_time_with_default,
  updated_at server_time_with_default
);

CREATE TRIGGER set_updated_at_feed_condition_type
BEFORE UPDATE ON feed_condition_type
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_field();

CREATE TABLE IF NOT EXISTS feed_condition (
  id SERIAL PRIMARY KEY,
  feed_id INTEGER NOT NULL REFERENCES feed(id) ON DELETE CASCADE,
  feed_condition_type_id INTEGER NOT NULL REFERENCES feed_condition_type(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source VARCHAR(16) NOT NULL DEFAULT 'auto',
  note TEXT,
  created_at server_time_with_default,
  updated_at server_time_with_default,
  UNIQUE(feed_id, feed_condition_type_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_condition_feed_id ON feed_condition(feed_id);
CREATE INDEX IF NOT EXISTS idx_feed_condition_type_id ON feed_condition(feed_condition_type_id);
CREATE INDEX IF NOT EXISTS idx_feed_condition_is_active ON feed_condition(is_active);

CREATE TRIGGER set_updated_at_feed_condition
BEFORE UPDATE ON feed_condition
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_field();

CREATE TABLE IF NOT EXISTS feed_policy (
  id SERIAL PRIMARY KEY,
  feed_id INTEGER NOT NULL UNIQUE REFERENCES feed(id) ON DELETE CASCADE,
  parse_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  public_visible BOOLEAN NOT NULL DEFAULT TRUE,
  add_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  primary_block_reason VARCHAR(64),
  last_policy_refresh_at TIMESTAMP,
  created_at server_time_with_default,
  updated_at server_time_with_default
);

CREATE TRIGGER set_updated_at_feed_policy
BEFORE UPDATE ON feed_policy
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_field();

CREATE TABLE IF NOT EXISTS feed_policy_override (
  id SERIAL PRIMARY KEY,
  feed_id INTEGER NOT NULL UNIQUE REFERENCES feed(id) ON DELETE CASCADE,
  parse_allowed_override BOOLEAN,
  public_visible_override BOOLEAN,
  add_allowed_override BOOLEAN,
  note TEXT,
  updated_by_admin_id INTEGER,
  created_at server_time_with_default,
  updated_at server_time_with_default
);

CREATE TRIGGER set_updated_at_feed_policy_override
BEFORE UPDATE ON feed_policy_override
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_field();

INSERT INTO feed_condition_type (condition_key) VALUES
  ('spam_detected'),
  ('oversized_detected'),
  ('takedown_active'),
  ('manual_block'),
  ('parse_failure_transient')
ON CONFLICT (condition_key) DO NOTHING;

INSERT INTO feed_condition (feed_id, feed_condition_type_id, is_active, source, note)
SELECT
  f.id,
  fct.id,
  TRUE,
  'auto',
  'Backfilled from feed_flag_status spam'
FROM feed f
JOIN feed_condition_type fct ON fct.condition_key = 'spam_detected'
WHERE f.feed_flag_status_id IN (3, 7)
ON CONFLICT (feed_id, feed_condition_type_id)
DO UPDATE SET is_active = EXCLUDED.is_active, source = EXCLUDED.source, note = EXCLUDED.note;

INSERT INTO feed_condition (feed_id, feed_condition_type_id, is_active, source, note)
SELECT
  f.id,
  fct.id,
  TRUE,
  'auto',
  'Backfilled from feed_flag_status takedown'
FROM feed f
JOIN feed_condition_type fct ON fct.condition_key = 'takedown_active'
WHERE f.feed_flag_status_id = 6
ON CONFLICT (feed_id, feed_condition_type_id)
DO UPDATE SET is_active = EXCLUDED.is_active, source = EXCLUDED.source, note = EXCLUDED.note;

INSERT INTO feed_policy (
  feed_id,
  parse_allowed,
  public_visible,
  add_allowed,
  primary_block_reason,
  last_policy_refresh_at
)
SELECT
  f.id,
  CASE
    WHEN f.feed_flag_status_id IN (6, 3, 4, 5) THEN FALSE
    ELSE TRUE
  END AS parse_allowed,
  CASE
    WHEN f.feed_flag_status_id IN (6, 3, 4, 5) THEN FALSE
    ELSE TRUE
  END AS public_visible,
  CASE
    WHEN f.feed_flag_status_id IN (6, 3, 4, 5) THEN FALSE
    ELSE TRUE
  END AS add_allowed,
  CASE
    WHEN f.feed_flag_status_id = 6 THEN 'takedown_active'
    WHEN f.feed_flag_status_id IN (3, 7) THEN 'spam_detected'
    ELSE NULL
  END AS primary_block_reason,
  NOW() AS last_policy_refresh_at
FROM feed f
ON CONFLICT (feed_id)
DO UPDATE SET
  parse_allowed = EXCLUDED.parse_allowed,
  public_visible = EXCLUDED.public_visible,
  add_allowed = EXCLUDED.add_allowed,
  primary_block_reason = EXCLUDED.primary_block_reason,
  last_policy_refresh_at = EXCLUDED.last_policy_refresh_at;
