-- 0025 migration
-- Lifecycle state (archive/takedown workflow) + audit table; backfill from
-- feed_flag_status_id. Canonical mapping (same semantics):
-- lifecycle + condition semantics aligned with app ORM at migration time.
-- Row-level CASE: active/always_parse/spam/spam_permitted -> active; pending_archive ->
-- pending_archive; archived -> archived; takedown -> takedown.

CREATE TABLE feed_lifecycle_state_type (
  id SERIAL PRIMARY KEY,
  state_key VARCHAR(64) UNIQUE NOT NULL,
  created_at server_time_with_default,
  updated_at server_time_with_default
);

CREATE TRIGGER set_updated_at_feed_lifecycle_state_type
BEFORE UPDATE ON feed_lifecycle_state_type
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_field();

INSERT INTO feed_lifecycle_state_type (state_key) VALUES
  ('active'),
  ('pending_archive'),
  ('archived'),
  ('takedown');

CREATE TABLE feed_lifecycle_state (
  id SERIAL PRIMARY KEY,
  feed_id INTEGER NOT NULL UNIQUE REFERENCES feed(id) ON DELETE CASCADE,
  feed_lifecycle_state_type_id INTEGER NOT NULL REFERENCES feed_lifecycle_state_type(id),
  reason_key VARCHAR(64),
  note TEXT,
  updated_by_source VARCHAR(16) NOT NULL DEFAULT 'system',
  updated_by_admin_id INTEGER,
  created_at server_time_with_default,
  updated_at server_time_with_default
);

CREATE TRIGGER set_updated_at_feed_lifecycle_state
BEFORE UPDATE ON feed_lifecycle_state
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_field();

CREATE INDEX idx_feed_lifecycle_state_type_id
  ON feed_lifecycle_state(feed_lifecycle_state_type_id);

CREATE INDEX idx_feed_condition_feed_id_active
  ON feed_condition(feed_id)
  WHERE is_active = TRUE;

CREATE TABLE feed_lifecycle_event (
  id SERIAL PRIMARY KEY,
  feed_id INTEGER NOT NULL REFERENCES feed(id) ON DELETE CASCADE,
  from_lifecycle_state_type_id INTEGER REFERENCES feed_lifecycle_state_type(id),
  to_lifecycle_state_type_id INTEGER NOT NULL REFERENCES feed_lifecycle_state_type(id),
  reason_key VARCHAR(64),
  note TEXT,
  source VARCHAR(16) NOT NULL,
  created_at server_time_with_default
);

CREATE INDEX idx_feed_lifecycle_event_feed_id ON feed_lifecycle_event(feed_id);
CREATE INDEX idx_feed_lifecycle_event_created_at ON feed_lifecycle_event(created_at);

INSERT INTO feed_lifecycle_state (
  feed_id,
  feed_lifecycle_state_type_id,
  reason_key,
  note,
  updated_by_source,
  updated_by_admin_id
)
SELECT
  f.id,
  CASE f.feed_flag_status_id
    WHEN 4 THEN flst_pa.id
    WHEN 5 THEN flst_ar.id
    WHEN 6 THEN flst_td.id
    ELSE flst_ac.id
  END,
  ffr.reason,
  f.feed_flag_status_reason_note,
  'system',
  NULL
FROM feed f
LEFT JOIN feed_flag_status_reason ffr ON ffr.id = f.feed_flag_status_reason_id
CROSS JOIN feed_lifecycle_state_type flst_ac
CROSS JOIN feed_lifecycle_state_type flst_pa
CROSS JOIN feed_lifecycle_state_type flst_ar
CROSS JOIN feed_lifecycle_state_type flst_td
WHERE flst_ac.state_key = 'active'
  AND flst_pa.state_key = 'pending_archive'
  AND flst_ar.state_key = 'archived'
  AND flst_td.state_key = 'takedown';

CREATE OR REPLACE FUNCTION feed_after_insert_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  lst_id INTEGER;
  reason_text VARCHAR(64);
BEGIN
  lst_id := CASE NEW.feed_flag_status_id
    WHEN 4 THEN (SELECT id FROM feed_lifecycle_state_type WHERE state_key = 'pending_archive' LIMIT 1)
    WHEN 5 THEN (SELECT id FROM feed_lifecycle_state_type WHERE state_key = 'archived' LIMIT 1)
    WHEN 6 THEN (SELECT id FROM feed_lifecycle_state_type WHERE state_key = 'takedown' LIMIT 1)
    ELSE (SELECT id FROM feed_lifecycle_state_type WHERE state_key = 'active' LIMIT 1)
  END;

  SELECT ffr.reason INTO reason_text
  FROM feed_flag_status_reason ffr
  WHERE ffr.id = NEW.feed_flag_status_reason_id;

  INSERT INTO feed_lifecycle_state (
    feed_id,
    feed_lifecycle_state_type_id,
    reason_key,
    note,
    updated_by_source
  )
  VALUES (
    NEW.id,
    lst_id,
    reason_text,
    NEW.feed_flag_status_reason_note,
    'system'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feed_after_insert_set_lifecycle
AFTER INSERT ON feed
FOR EACH ROW
EXECUTE FUNCTION feed_after_insert_lifecycle();
