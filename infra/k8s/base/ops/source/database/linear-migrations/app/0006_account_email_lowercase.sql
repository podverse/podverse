-- An account email and a pending email change are stored trimmed and lowercase.
-- The unique index on email then also refuses a second row that differs only by letter case.

UPDATE public.account_credentials
SET email = lower(btrim(email))
WHERE email IS NOT NULL
  AND email IS DISTINCT FROM lower(btrim(email));

ALTER TABLE public.account_credentials
  ADD CONSTRAINT chk_account_credentials_email_lowercase
  CHECK (email IS NULL OR email = lower(btrim(email)));

UPDATE public.account_email_change_verification
SET pending_email_address = lower(btrim(pending_email_address))
WHERE pending_email_address IS DISTINCT FROM lower(btrim(pending_email_address));

ALTER TABLE public.account_email_change_verification
  ADD CONSTRAINT chk_account_email_change_verification_pending_lowercase
  CHECK (pending_email_address = lower(btrim(pending_email_address)));
