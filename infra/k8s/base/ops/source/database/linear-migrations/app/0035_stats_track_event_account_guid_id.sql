ALTER TABLE stats_track_event_channel
    ADD COLUMN stats_track_account_guid_id INT NULL;

CREATE INDEX stats_track_event_channel_stats_track_account_guid_id_idx
    ON stats_track_event_channel(stats_track_account_guid_id);

UPDATE stats_track_event_channel e
SET stats_track_account_guid_id = g.id
FROM stats_track_account_guid g
WHERE e.account_guid = g.account_guid;

ALTER TABLE stats_track_event_channel
    ALTER COLUMN stats_track_account_guid_id SET NOT NULL;

ALTER TABLE stats_track_event_channel
    ADD CONSTRAINT stats_track_event_channel_stats_track_account_guid_id_fkey
    FOREIGN KEY (stats_track_account_guid_id) REFERENCES stats_track_account_guid(id) ON DELETE CASCADE;

ALTER TABLE stats_track_event_channel
    DROP CONSTRAINT stats_track_event_channel_account_guid_fkey;

ALTER TABLE stats_track_event_item
    ADD COLUMN stats_track_account_guid_id INT NULL;

CREATE INDEX stats_track_event_item_stats_track_account_guid_id_idx
    ON stats_track_event_item(stats_track_account_guid_id);

UPDATE stats_track_event_item e
SET stats_track_account_guid_id = g.id
FROM stats_track_account_guid g
WHERE e.account_guid = g.account_guid;

ALTER TABLE stats_track_event_item
    ALTER COLUMN stats_track_account_guid_id SET NOT NULL;

ALTER TABLE stats_track_event_item
    ADD CONSTRAINT stats_track_event_item_stats_track_account_guid_id_fkey
    FOREIGN KEY (stats_track_account_guid_id) REFERENCES stats_track_account_guid(id) ON DELETE CASCADE;

ALTER TABLE stats_track_event_item
    DROP CONSTRAINT stats_track_event_item_account_guid_fkey;

ALTER TABLE stats_track_event_clip
    ADD COLUMN stats_track_account_guid_id INT NULL;

CREATE INDEX stats_track_event_clip_stats_track_account_guid_id_idx
    ON stats_track_event_clip(stats_track_account_guid_id);

UPDATE stats_track_event_clip e
SET stats_track_account_guid_id = g.id
FROM stats_track_account_guid g
WHERE e.account_guid = g.account_guid;

ALTER TABLE stats_track_event_clip
    ALTER COLUMN stats_track_account_guid_id SET NOT NULL;

ALTER TABLE stats_track_event_clip
    ADD CONSTRAINT stats_track_event_clip_stats_track_account_guid_id_fkey
    FOREIGN KEY (stats_track_account_guid_id) REFERENCES stats_track_account_guid(id) ON DELETE CASCADE;

ALTER TABLE stats_track_event_clip
    DROP CONSTRAINT stats_track_event_clip_account_guid_fkey;

ALTER TABLE stats_track_event_playlist
    ADD COLUMN stats_track_account_guid_id INT NULL;

CREATE INDEX stats_track_event_playlist_stats_track_account_guid_id_idx
    ON stats_track_event_playlist(stats_track_account_guid_id);

UPDATE stats_track_event_playlist e
SET stats_track_account_guid_id = g.id
FROM stats_track_account_guid g
WHERE e.account_guid = g.account_guid;

ALTER TABLE stats_track_event_playlist
    ALTER COLUMN stats_track_account_guid_id SET NOT NULL;

ALTER TABLE stats_track_event_playlist
    ADD CONSTRAINT stats_track_event_playlist_stats_track_account_guid_id_fkey
    FOREIGN KEY (stats_track_account_guid_id) REFERENCES stats_track_account_guid(id) ON DELETE CASCADE;

ALTER TABLE stats_track_event_playlist
    DROP CONSTRAINT stats_track_event_playlist_account_guid_fkey;

ALTER TABLE stats_track_event_account
    ADD COLUMN stats_track_account_guid_id INT NULL;

CREATE INDEX stats_track_event_account_stats_track_account_guid_id_idx
    ON stats_track_event_account(stats_track_account_guid_id);

UPDATE stats_track_event_account e
SET stats_track_account_guid_id = g.id
FROM stats_track_account_guid g
WHERE e.account_guid = g.account_guid;

ALTER TABLE stats_track_event_account
    ALTER COLUMN stats_track_account_guid_id SET NOT NULL;

ALTER TABLE stats_track_event_account
    ADD CONSTRAINT stats_track_event_account_stats_track_account_guid_id_fkey
    FOREIGN KEY (stats_track_account_guid_id) REFERENCES stats_track_account_guid(id) ON DELETE CASCADE;

ALTER TABLE stats_track_event_account
    DROP CONSTRAINT stats_track_event_account_account_guid_fkey;
