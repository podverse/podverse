-- max_queue_resources is the account's per-queue row tier (upcoming, now playing, and history).
-- Null uses the default of 10000. A listed tier is the cap. There is no unlimited value.

ALTER TABLE public.account_membership_status
  ADD COLUMN max_queue_resources integer;

ALTER TABLE public.account_membership_status
  ADD CONSTRAINT account_membership_status_max_queue_resources_check
  CHECK (
    max_queue_resources IS NULL
    OR max_queue_resources IN (20000, 30000, 40000, 50000, 60000, 100000)
  );

-- A caller that already trimmed the rows sets podverse.queue_limit_bulk to on for the inserts.
-- The cap is the account tier, or 10000 when the column is null.
CREATE OR REPLACE FUNCTION public.enforce_queue_resource_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    resource_count INTEGER;
    max_resources INTEGER;
    min_id INTEGER;
BEGIN
    IF current_setting('podverse.queue_limit_bulk', true) = 'on' THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(ams.max_queue_resources, 10000)
      INTO max_resources
    FROM queue q
    LEFT JOIN account_membership_status ams ON ams.account_id = q.account_id
    WHERE q.id = NEW.queue_id;

    SELECT COUNT(*) INTO resource_count
    FROM queue_resource
    WHERE queue_id = NEW.queue_id;

    IF resource_count >= max_resources THEN
        -- Evict the oldest listened history row first so retention follows history ordering.
        SELECT id INTO min_id
        FROM queue_resource
        WHERE queue_id = NEW.queue_id
          AND list_position < 0
        ORDER BY last_played_at ASC NULLS FIRST, list_position ASC
        LIMIT 1;

        IF min_id IS NULL THEN
            -- Fallback when a queue has no history rows yet (all upcoming/now-playing).
            SELECT id INTO min_id
            FROM queue_resource
            WHERE queue_id = NEW.queue_id
            ORDER BY list_position ASC
            LIMIT 1;
        END IF;

        IF min_id IS NOT NULL THEN
            DELETE FROM queue_resource WHERE id = min_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
