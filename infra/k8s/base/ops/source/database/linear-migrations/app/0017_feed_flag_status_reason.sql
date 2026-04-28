-- 0017 migration

-- Feed Flag Status Reason lookup table
-- Predefined reasons for why a feed flag status was set (especially for takedown/moderation).
CREATE TABLE feed_flag_status_reason (
    id SERIAL PRIMARY KEY,
    reason TEXT UNIQUE NOT NULL,
    created_at server_time_with_default,
    updated_at server_time_with_default
);

CREATE TRIGGER set_updated_at_feed_flag_status_reason
BEFORE UPDATE ON feed_flag_status_reason
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_field();

-- Seed predefined reasons
INSERT INTO feed_flag_status_reason (reason) VALUES
    ('copyright'),
    ('illegal_content'),
    ('spam'),
    ('malware'),
    ('dead_feed'),
    ('owner_request'),
    ('other');

-- Add reason columns to the feed table
ALTER TABLE feed ADD COLUMN feed_flag_status_reason_id INTEGER REFERENCES feed_flag_status_reason(id);
ALTER TABLE feed ADD COLUMN feed_flag_status_reason_note TEXT;

CREATE INDEX idx_feed_feed_flag_status_reason_id ON feed(feed_flag_status_reason_id);
