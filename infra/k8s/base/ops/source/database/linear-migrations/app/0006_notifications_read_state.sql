-- Notifications are read/unread; channel content is seen/unseen.
--
-- Both indicators are timestamps named last_*_at, so sharing a verb between them makes a query or a
-- log line ambiguous about which badge it belongs to. account_following_channel.last_seen_at counts
-- episodes a user has not looked at; this column counts inbox rows they have not opened.
--
-- The purge job deletes notifications on a retention window, so this timestamp can outlive every row
-- it was ever compared against. That is harmless: a timestamp with nothing newer than it counts
-- zero, which is the same answer as an inbox that has been read.

ALTER TABLE public.account
    RENAME COLUMN notifications_last_seen_at TO notifications_last_read_at;
