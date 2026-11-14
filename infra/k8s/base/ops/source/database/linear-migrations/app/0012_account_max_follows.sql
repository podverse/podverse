-- max_follows is the account's directory-follow tier.
-- Null uses the shared default of 500. -1 is unlimited. A listed tier is the cap.
-- 500 is not stored, so a later change to the default still applies to an empty column.

ALTER TABLE public.account_membership_status
  ADD COLUMN max_follows integer;

ALTER TABLE public.account_membership_status
  ADD CONSTRAINT account_membership_status_max_follows_check
  CHECK (
    max_follows IS NULL
    OR max_follows = -1
    OR max_follows IN (1000, 2000, 3000, 4000, 5000, 10000)
  );

-- Accounts already over the default take the smallest tier that covers the three follow tables.
-- A count past 10000 stays empty for an operator. Unlimited is not written. Rows are not removed.
UPDATE public.account_membership_status AS ams
SET max_follows = CASE
  WHEN counts.total <= 1000 THEN 1000
  WHEN counts.total <= 2000 THEN 2000
  WHEN counts.total <= 3000 THEN 3000
  WHEN counts.total <= 4000 THEN 4000
  WHEN counts.total <= 5000 THEN 5000
  ELSE 10000
END
FROM (
  SELECT account_id, SUM(n)::int AS total
  FROM (
    SELECT account_id, COUNT(*)::int AS n
    FROM public.account_following_channel
    GROUP BY account_id
    UNION ALL
    SELECT account_id, COUNT(*)::int AS n
    FROM public.account_following_playlist
    GROUP BY account_id
    UNION ALL
    SELECT account_id, COUNT(*)::int AS n
    FROM public.account_following_account
    GROUP BY account_id
  ) AS parts
  GROUP BY account_id
) AS counts
WHERE ams.account_id = counts.account_id
  AND ams.max_follows IS NULL
  AND counts.total > 500
  AND counts.total <= 10000;
