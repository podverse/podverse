-- Versioned popularity-tracking consent on account_settings.
--
-- NULL accepted means the account has never decided. Tracking is allowed only when accepted is
-- true and the stored version matches the current server agreement version. A decline is stored
-- so a later version bump does not re-prompt opted-out users.

ALTER TABLE public.account_settings
    ADD COLUMN listen_stats_accepted boolean,
    ADD COLUMN listen_stats_agreement_version character varying(64),
    ADD COLUMN listen_stats_decided_at timestamp with time zone;

ALTER TABLE public.account_settings
    ALTER COLUMN allow_listen_stats SET DEFAULT false;

UPDATE public.account_settings
SET
    allow_listen_stats = false,
    listen_stats_accepted = NULL,
    listen_stats_agreement_version = NULL,
    listen_stats_decided_at = NULL;
