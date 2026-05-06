-- 0027 migration
-- Drops superseded feed_flag_status / feed_flag_status_reason tables and related feed FK columns.
-- Takedown reason catalog moves to feed_takedown_reason (data copied from feed_flag_status_reason).

CREATE TABLE feed_takedown_reason (
    id SERIAL PRIMARY KEY,
    reason TEXT UNIQUE NOT NULL,
    created_at server_time_with_default,
    updated_at server_time_with_default
);

CREATE TRIGGER set_updated_at_feed_takedown_reason
BEFORE UPDATE ON feed_takedown_reason
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_field();

INSERT INTO feed_takedown_reason (id, reason, created_at, updated_at)
SELECT id, reason, created_at, updated_at FROM feed_flag_status_reason;

SELECT setval(
  pg_get_serial_sequence('feed_takedown_reason', 'id'),
  COALESCE((SELECT MAX(id) FROM feed_takedown_reason), 1)
);

DROP TRIGGER IF EXISTS feed_after_insert_set_lifecycle ON feed;

CREATE OR REPLACE FUNCTION feed_after_insert_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO feed_lifecycle_state (
    feed_id,
    feed_lifecycle_state_type_id,
    reason_key,
    note,
    updated_by_source
  )
  VALUES (
    NEW.id,
    (SELECT id FROM feed_lifecycle_state_type WHERE state_key = 'active' LIMIT 1),
    NULL,
    NULL,
    'system'
  )
  ON CONFLICT (feed_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feed_after_insert_set_lifecycle
AFTER INSERT ON feed
FOR EACH ROW
EXECUTE FUNCTION feed_after_insert_lifecycle();

ALTER TABLE feed DROP CONSTRAINT IF EXISTS feed_feed_flag_status_id_fkey;
ALTER TABLE feed DROP CONSTRAINT IF EXISTS feed_feed_flag_status_reason_id_fkey;

DROP INDEX IF EXISTS idx_feed_feed_flag_status_id;
DROP INDEX IF EXISTS idx_feed_feed_flag_status_reason_id;

ALTER TABLE feed DROP COLUMN IF EXISTS feed_flag_status_id;
ALTER TABLE feed DROP COLUMN IF EXISTS feed_flag_status_reason_id;
ALTER TABLE feed DROP COLUMN IF EXISTS feed_flag_status_reason_note;

DROP TABLE IF EXISTS feed_flag_status CASCADE;
DROP TABLE IF EXISTS feed_flag_status_reason CASCADE;
