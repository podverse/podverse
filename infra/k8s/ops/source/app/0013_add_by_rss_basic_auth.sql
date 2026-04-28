-- 0013: Add optional Basic Auth columns for add-by-RSS feeds (Option A: two columns).
-- Credentials are stored per account+feed_url; never expose password in API responses.

ALTER TABLE account_following_add_by_rss_channel
    ADD COLUMN basic_auth_username varchar_normal NULL,
    ADD COLUMN basic_auth_password varchar_normal NULL;
