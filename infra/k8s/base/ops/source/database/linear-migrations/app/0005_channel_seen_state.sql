-- Per-channel seen state.
--
-- One timestamp per follow rather than a seen flag per episode: a channel's unseen count is however
-- many of its items published after this moment, so storage stays proportional to subscriptions
-- instead of to episodes, and the value syncs across devices as a single field.
--
-- The column lives on the follow row because that is exactly the grain the state has — an account
-- and a channel it follows. Unfollowing drops the timestamp with the follow, which is the intended
-- behaviour and comes free with the existing cascade.
--
-- NULL means the account has never opened the channel, which reads as nothing unseen. Following a
-- show must not immediately claim its whole back catalogue is new.

ALTER TABLE public.account_following_channel
    ADD COLUMN last_seen_at timestamp with time zone;

ALTER TABLE public.account_following_add_by_rss_channel
    ADD COLUMN last_seen_at timestamp with time zone;

-- Counting a channel's items published after a moment reads (channel_id, pub_date) together. The
-- separate single-column indexes make the planner choose between filtering by channel and filtering
-- by date; this one lets it do both, which is what bounds the count query to the rows it will
-- actually return.
CREATE INDEX idx_item_channel_id_pub_date
    ON public.item USING btree (channel_id, pub_date DESC);
