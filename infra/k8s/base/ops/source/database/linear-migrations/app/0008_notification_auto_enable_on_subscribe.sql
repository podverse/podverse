-- Opt-in auto-enable of per-channel notifications when an account follows a channel.
--
-- Following a channel is notification-free unless the account asks otherwise, so the column
-- defaults to false. When true, a successful follow also creates the per-channel notification
-- row, copying the account's notification type defaults.

ALTER TABLE public.account_settings_notification
    ADD COLUMN auto_enable_on_subscribe boolean DEFAULT false NOT NULL;
