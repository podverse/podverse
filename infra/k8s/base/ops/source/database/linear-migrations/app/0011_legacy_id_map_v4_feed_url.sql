-- v4_feed_url is the v4 authority feed URL for a podcast row. It is public catalog data.

ALTER TABLE public.legacy_id_map ADD COLUMN v4_feed_url public.varchar_url;
