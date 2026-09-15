-- Add meaningful-playback timestamps to queue_resource, preserve existing history order, and keep
-- queue eviction aligned with oldest-listen semantics after ordering moves off list_position.

ALTER TABLE public.queue_resource
    ADD COLUMN last_played_at timestamptz,
    ADD COLUMN last_played_received_at timestamptz;

WITH migration_anchor AS (
    SELECT statement_timestamp() AS migration_time
),
classified_rows AS (
    SELECT
        qr.id,
        qr.queue_id,
        qr.list_position,
        CASE
            WHEN qr.list_position > 0 THEN 'upcoming'
            WHEN qr.list_position BETWEEN -0.000000000000000000001::numeric
                AND 0.000000000000000000001::numeric THEN 'now_playing'
            ELSE 'history'
        END AS zone
    FROM public.queue_resource AS qr
),
history_backfill AS (
    SELECT
        cr.id,
        ma.migration_time
            - (ROW_NUMBER() OVER (PARTITION BY cr.queue_id ORDER BY cr.list_position DESC)
                * INTERVAL '1 millisecond') AS played_at
    FROM classified_rows AS cr
    CROSS JOIN migration_anchor AS ma
    WHERE cr.zone = 'history'
),
now_playing_backfill AS (
    SELECT cr.id, ma.migration_time AS played_at
    FROM classified_rows AS cr
    CROSS JOIN migration_anchor AS ma
    WHERE cr.zone = 'now_playing'
),
combined_backfill AS (
    SELECT id, played_at FROM history_backfill
    UNION ALL
    SELECT id, played_at FROM now_playing_backfill
)
UPDATE public.queue_resource AS qr
SET
    last_played_at = cb.played_at,
    last_played_received_at = cb.played_at
FROM combined_backfill AS cb
WHERE qr.id = cb.id;

CREATE INDEX idx_queue_resource_queue_id_last_played_at
    ON public.queue_resource (queue_id, last_played_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_queue_resource_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    resource_count INTEGER;
    max_resources CONSTANT INTEGER := 10000;
    min_id INTEGER;
BEGIN
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
