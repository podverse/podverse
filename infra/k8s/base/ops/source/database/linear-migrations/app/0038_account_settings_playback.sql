-- 0038: Per-account playback preferences (extensible child of account_settings).
--   preferred_media_type drives the default alternate-enclosure pick in the main
--   media player; the table is intended to grow (e.g. bitrate/quality) later.

CREATE TABLE account_settings_playback (
    id SERIAL PRIMARY KEY,
    account_settings_id integer NOT NULL REFERENCES account_settings(id) ON DELETE CASCADE UNIQUE,
    preferred_media_type varchar NOT NULL DEFAULT 'video' CHECK (preferred_media_type IN ('audio', 'video'))
);
