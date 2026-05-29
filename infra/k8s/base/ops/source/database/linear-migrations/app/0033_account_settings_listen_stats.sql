-- 0033: User preference for first-party listen-stats (popularity tracking).

ALTER TABLE account_settings ADD COLUMN allow_listen_stats boolean NOT NULL DEFAULT true;
