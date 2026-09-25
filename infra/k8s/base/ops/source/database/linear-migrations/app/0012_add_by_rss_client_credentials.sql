-- Add-by-RSS Basic Auth credentials live only on the user's devices.
--
-- Devices send credentials with each parse or chapters request; the API seals them into a
-- short-lived queue envelope and nothing is written to the database. The follow row keeps only
-- `requires_credentials`, a hint that the feed answered 401 without credentials (or was saved
-- with them) so devices can prompt before a refresh instead of failing.
--
-- Rows that carried credentials — in the dedicated columns or as `user:pass@` userinfo in
-- feed_url — are flagged, userinfo is stripped from feed_url, and the credential columns are
-- dropped. Users re-enter credentials on each device.

ALTER TABLE public.account_following_add_by_rss_channel
    ADD COLUMN requires_credentials boolean DEFAULT false NOT NULL;

UPDATE public.account_following_add_by_rss_channel
SET requires_credentials = true
WHERE basic_auth_username IS NOT NULL
    OR basic_auth_password IS NOT NULL
    OR feed_url ~ '^[A-Za-z][A-Za-z0-9+.-]*://[^/?#]*@';

-- Stripping userinfo can make two rows for one account share a feed_url (a URL saved with and
-- without userinfo, or with two different userinfos). Keep one per account and stripped URL:
-- the flagged row first, then the row whose feed_url had no userinfo, then the lowest feed_url.
WITH ranked AS (
    SELECT
        account_id,
        feed_url,
        row_number() OVER (
            PARTITION BY
                account_id,
                regexp_replace(feed_url, '^([A-Za-z][A-Za-z0-9+.-]*://)[^/?#]*@', '\1')
            ORDER BY
                requires_credentials DESC,
                (feed_url !~ '^[A-Za-z][A-Za-z0-9+.-]*://[^/?#]*@') DESC,
                feed_url
        ) AS keep_rank
    FROM public.account_following_add_by_rss_channel
)
DELETE FROM public.account_following_add_by_rss_channel AS follow
USING ranked
WHERE follow.account_id = ranked.account_id
    AND follow.feed_url = ranked.feed_url
    AND ranked.keep_rank > 1;

UPDATE public.account_following_add_by_rss_channel
SET feed_url = regexp_replace(feed_url, '^([A-Za-z][A-Za-z0-9+.-]*://)[^/?#]*@', '\1')
WHERE feed_url ~ '^[A-Za-z][A-Za-z0-9+.-]*://[^/?#]*@';

ALTER TABLE public.account_following_add_by_rss_channel
    DROP COLUMN basic_auth_username,
    DROP COLUMN basic_auth_password;
