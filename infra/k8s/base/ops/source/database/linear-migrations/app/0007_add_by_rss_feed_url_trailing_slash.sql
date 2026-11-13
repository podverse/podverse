-- An add-by-RSS follow path does not keep a trailing slash. The host root stays as stored.
-- When both forms exist, the row with the slash is removed and the other row stays.

DELETE FROM public.account_following_add_by_rss_channel AS extra
USING public.account_following_add_by_rss_channel AS kept
WHERE extra.account_id = kept.account_id
  AND length(extra.feed_url) > length(kept.feed_url)
  AND extra.feed_url ~ '^https?://[^/?#]+/.*/([?#].*)?$'
  AND regexp_replace(extra.feed_url, '/+((\?|#).*)?$', '\1')
    = regexp_replace(kept.feed_url, '/+((\?|#).*)?$', '\1');

UPDATE public.account_following_add_by_rss_channel
SET feed_url = regexp_replace(feed_url, '/+((\?|#).*)?$', '\1')
WHERE feed_url ~ '^https?://[^/?#]+/.*/([?#].*)?$';
