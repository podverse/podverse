-- Effective queue cap acknowledged for the one-time history limit notice. Null has not been acknowledged.

ALTER TABLE public.account_membership_status
  ADD COLUMN queue_history_limit_notice_limit integer;
