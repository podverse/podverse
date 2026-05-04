-- 0020: Track last deep checksum verification for image shrink origins.

ALTER TABLE image_shrink_source
    ADD COLUMN last_deep_checked_at server_time NULL;

CREATE INDEX idx_image_shrink_source_last_deep_checked_at
    ON image_shrink_source(last_deep_checked_at DESC);
