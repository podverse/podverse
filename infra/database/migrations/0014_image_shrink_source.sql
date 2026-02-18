-- 0014: Add image_shrink_source for origin metadata tracking.

CREATE TABLE image_shrink_source (
    id SERIAL PRIMARY KEY,
    url varchar_url NOT NULL UNIQUE,
    etag varchar_normal NULL,
    last_modified varchar_normal NULL,
    content_length INTEGER NULL,
    checksum_sha256 varchar_normal NULL,
    last_checked_at server_time NULL,
    last_changed_at server_time NULL,
    created_at server_time_with_default NOT NULL,
    updated_at server_time_with_default NOT NULL
);

CREATE INDEX idx_image_shrink_source_last_checked_at ON image_shrink_source(last_checked_at DESC);

CREATE TRIGGER set_updated_at_image_shrink_source
    BEFORE UPDATE ON image_shrink_source
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_field();
