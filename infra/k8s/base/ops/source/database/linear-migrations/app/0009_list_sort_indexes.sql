-- Indexes for the Home and Browse list orders, and removal of the ones they make redundant.
--
-- Each composite below starts with the column an existing single-column index already covered, so
-- that older index is dropped in the same step: a composite serves every query its leftmost prefix
-- could serve, and keeping both would pay twice on write for one read path.
--
-- Subscribed A-Z filters follows by medium and orders by sortable_title. Subscribed and directory
-- recent lists order by channel_about.last_pub_date and join back on channel_id. Category Browse
-- narrows by category_id and joins on channel_id.
--
-- The popularity lists deliberately get nothing here. They order stats rows by whichever range
-- column the request asked for — day, week, month, or all-time — and each of those already has its
-- own index, so a composite on one range would optimize a quarter of the feature. Looking a ranked
-- row back up by entity is served by the UNIQUE constraint on that column, which resolves to a
-- single row and cannot be improved by appending a count to it.

CREATE INDEX idx_channel_medium_id_sortable_title
    ON public.channel USING btree (medium_id, sortable_title);

DROP INDEX public.idx_channel_medium_id;

CREATE INDEX idx_channel_about_last_pub_date_desc_channel_id
    ON public.channel_about USING btree (last_pub_date DESC, channel_id);

DROP INDEX public.idx_channel_about_last_pub_date;

CREATE INDEX idx_channel_category_category_id_channel_id
    ON public.channel_category USING btree (category_id, channel_id);

DROP INDEX public.idx_channel_category_category_id;

-- Each stats table declares UNIQUE on its entity column, which Postgres backs with its own index.
-- These plain indexes on the same single column are duplicates of that one.

DROP INDEX public.stats_aggregated_channel_channel_id_idx;

DROP INDEX public.stats_aggregated_item_item_id_idx;

DROP INDEX public.stats_aggregated_clip_clip_id_idx;

DROP INDEX public.stats_aggregated_playlist_playlist_id_idx;

DROP INDEX public.stats_aggregated_account_tracked_account_id_idx;
