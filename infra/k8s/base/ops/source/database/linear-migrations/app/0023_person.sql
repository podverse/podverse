-- People are one row per standardized name. distinction_key stays empty until a later
-- split gives the same display name its own public id. summary stays null until a short
-- descriptor is written. Credits keep their own image and href.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE FUNCTION public.person_name_key(raw text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT NULLIF(
    left(
      regexp_replace(
        regexp_replace(
          lower(normalize(btrim(coalesce(raw, '')), NFKC)),
          '[^[:alnum:]]+',
          '-',
          'g'
        ),
        '^-+|-+$',
        '',
        'g'
      ),
      255
    ),
    ''
  );
$$;

CREATE TABLE public.person (
    id integer GENERATED ALWAYS AS IDENTITY,
    id_text public.nano_id_v2 NOT NULL,
    name_key character varying(255) NOT NULL,
    distinction_key character varying(64) DEFAULT ''::character varying NOT NULL,
    display_name character varying(255) NOT NULL,
    summary text,
    list_image_url character varying(2083),
    item_appearance_count integer DEFAULT 0 NOT NULL,
    channel_cast_count integer DEFAULT 0 NOT NULL,
    latest_appearance_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT person_pkey PRIMARY KEY (id),
    CONSTRAINT person_id_text_key UNIQUE (id_text),
    CONSTRAINT person_name_distinction_key UNIQUE (name_key, distinction_key),
    CONSTRAINT person_counts_check CHECK (item_appearance_count >= 0 AND channel_cast_count >= 0)
);

CREATE INDEX person_name_key_idx ON public.person USING btree (name_key);
CREATE INDEX person_name_key_trgm_idx ON public.person USING gin (name_key public.gin_trgm_ops);
CREATE INDEX person_latest_appearance_idx ON public.person USING btree (latest_appearance_at DESC NULLS LAST, id DESC);

CREATE TRIGGER set_updated_at_person
  BEFORE UPDATE ON public.person
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();

INSERT INTO public.person (id_text, name_key, distinction_key, display_name)
SELECT
    'p' || lpad(row_number() OVER (ORDER BY keyed.name_key)::text, 9, '0'),
    keyed.name_key,
    '',
    keyed.display_name
FROM (
    SELECT DISTINCT ON (public.person_name_key(name))
        public.person_name_key(name) AS name_key,
        left(btrim(name), 255) AS display_name
    FROM (
        SELECT name FROM public.channel_person
        UNION ALL
        SELECT name FROM public.item_person
    ) names
    WHERE public.person_name_key(name) IS NOT NULL
    ORDER BY public.person_name_key(name), name
) keyed;

ALTER TABLE public.channel_person
    ADD COLUMN person_id integer,
    ADD COLUMN person_id_text public.nano_id_v2;

ALTER TABLE public.item_person
    ADD COLUMN person_id integer,
    ADD COLUMN person_id_text public.nano_id_v2;

UPDATE public.channel_person credit
SET person_id = person.id,
    person_id_text = person.id_text
FROM public.person person
WHERE person.distinction_key = ''
  AND person.name_key = public.person_name_key(credit.name);

UPDATE public.item_person credit
SET person_id = person.id,
    person_id_text = person.id_text
FROM public.person person
WHERE person.distinction_key = ''
  AND person.name_key = public.person_name_key(credit.name);

ALTER TABLE public.channel_person
    ADD CONSTRAINT channel_person_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.person(id) ON DELETE SET NULL;

ALTER TABLE public.item_person
    ADD CONSTRAINT item_person_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES public.person(id) ON DELETE SET NULL;

CREATE INDEX channel_person_person_id_idx ON public.channel_person USING btree (person_id);
CREATE INDEX item_person_person_id_idx ON public.item_person USING btree (person_id);

CREATE TABLE public.channel_item_person_count (
    channel_id integer NOT NULL,
    person_id integer NOT NULL,
    item_count integer NOT NULL,
    CONSTRAINT channel_item_person_count_pkey PRIMARY KEY (channel_id, person_id),
    CONSTRAINT channel_item_person_count_item_count_check CHECK (item_count > 0),
    CONSTRAINT channel_item_person_count_channel_id_fkey
        FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE,
    CONSTRAINT channel_item_person_count_person_id_fkey
        FOREIGN KEY (person_id) REFERENCES public.person(id) ON DELETE CASCADE
);

CREATE INDEX channel_item_person_count_channel_item_count_idx
    ON public.channel_item_person_count USING btree (channel_id, item_count DESC, person_id);
CREATE INDEX channel_item_person_count_person_id_idx
    ON public.channel_item_person_count USING btree (person_id);

INSERT INTO public.channel_item_person_count (channel_id, person_id, item_count)
SELECT item.channel_id, credit.person_id, count(DISTINCT credit.item_id)::integer
FROM public.item_person credit
JOIN public.item item ON item.id = credit.item_id
WHERE credit.person_id IS NOT NULL
GROUP BY item.channel_id, credit.person_id;

ALTER TABLE public.channel
    ADD COLUMN person_appearance_count integer DEFAULT 0 NOT NULL;

UPDATE public.channel channel
SET person_appearance_count = COALESCE((
    SELECT count(*)::integer
    FROM public.channel_item_person_count counted
    WHERE counted.channel_id = channel.id
), 0);

UPDATE public.person person
SET item_appearance_count = COALESCE((
        SELECT count(DISTINCT credit.item_id)::integer
        FROM public.item_person credit
        JOIN public.item item ON item.id = credit.item_id
        JOIN public.channel channel ON channel.id = item.channel_id
        WHERE credit.person_id = person.id
          AND COALESCE((
              SELECT policy.public_visible
              FROM public.feed_policy policy
              WHERE policy.feed_id = channel.feed_id
          ), true)
    ), 0),
    channel_cast_count = COALESCE((
        SELECT count(DISTINCT credit.channel_id)::integer
        FROM public.channel_person credit
        JOIN public.channel channel ON channel.id = credit.channel_id
        WHERE credit.person_id = person.id
          AND COALESCE((
              SELECT policy.public_visible
              FROM public.feed_policy policy
              WHERE policy.feed_id = channel.feed_id
          ), true)
    ), 0),
    latest_appearance_at = (
        SELECT max(item.pub_date)
        FROM public.item_person credit
        JOIN public.item item ON item.id = credit.item_id
        JOIN public.channel channel ON channel.id = item.channel_id
        WHERE credit.person_id = person.id
          AND COALESCE((
              SELECT policy.public_visible
              FROM public.feed_policy policy
              WHERE policy.feed_id = channel.feed_id
          ), true)
    ),
    list_image_url = (
        SELECT image.img
        FROM (
            SELECT credit.img AS img,
                   about.last_pub_date AS at,
                   1 AS rank
            FROM public.channel_person credit
            JOIN public.channel channel ON channel.id = credit.channel_id
            LEFT JOIN public.channel_about about ON about.channel_id = channel.id
            WHERE credit.person_id = person.id
              AND credit.person_group = 'crew'
              AND credit.img IS NOT NULL
              AND credit.img <> ''
            UNION ALL
            SELECT credit.img,
                   about.last_pub_date,
                   2
            FROM public.channel_person credit
            JOIN public.channel channel ON channel.id = credit.channel_id
            LEFT JOIN public.channel_about about ON about.channel_id = channel.id
            WHERE credit.person_id = person.id
              AND credit.img IS NOT NULL
              AND credit.img <> ''
            UNION ALL
            SELECT credit.img,
                   item.pub_date,
                   3
            FROM public.item_person credit
            JOIN public.item item ON item.id = credit.item_id
            WHERE credit.person_id = person.id
              AND credit.img IS NOT NULL
              AND credit.img <> ''
        ) image
        ORDER BY image.rank ASC, image.at DESC NULLS LAST
        LIMIT 1
    );

CREATE TABLE public.account_following_person (
    account_id integer NOT NULL,
    person_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_following_person_pkey PRIMARY KEY (account_id, person_id),
    CONSTRAINT account_following_person_account_id_fkey
        FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE,
    CONSTRAINT account_following_person_person_id_fkey
        FOREIGN KEY (person_id) REFERENCES public.person(id) ON DELETE CASCADE
);

CREATE INDEX account_following_person_person_id_idx
    ON public.account_following_person USING btree (person_id);

CREATE TABLE public.stats_daily_person (
    person_id integer NOT NULL,
    day date NOT NULL,
    listener_count integer DEFAULT 0 NOT NULL,
    all_time_listener_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT stats_daily_person_pkey PRIMARY KEY (person_id, day),
    CONSTRAINT stats_daily_person_counts_check CHECK (
        listener_count >= 0
        AND all_time_listener_count >= 0
        AND all_time_listener_count <= listener_count
    ),
    CONSTRAINT stats_daily_person_person_id_fkey
        FOREIGN KEY (person_id) REFERENCES public.person(id) ON DELETE CASCADE
);

CREATE TABLE public.stats_popularity_person (
    person_id integer NOT NULL,
    day_count integer DEFAULT 0 NOT NULL,
    week_count integer DEFAULT 0 NOT NULL,
    month_count integer DEFAULT 0 NOT NULL,
    all_time_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT stats_popularity_person_pkey PRIMARY KEY (person_id),
    CONSTRAINT stats_popularity_person_person_id_fkey
        FOREIGN KEY (person_id) REFERENCES public.person(id) ON DELETE CASCADE
);

CREATE INDEX stats_popularity_person_day_idx
    ON public.stats_popularity_person USING btree (day_count DESC, person_id);
CREATE INDEX stats_popularity_person_week_idx
    ON public.stats_popularity_person USING btree (week_count DESC, person_id);
CREATE INDEX stats_popularity_person_month_idx
    ON public.stats_popularity_person USING btree (month_count DESC, person_id);
CREATE INDEX stats_popularity_person_all_time_idx
    ON public.stats_popularity_person USING btree (all_time_count DESC, person_id);

CREATE TABLE public.stats_person_all_time_mark (
    listener_id uuid NOT NULL,
    person_id integer NOT NULL,
    counted_at timestamp with time zone NOT NULL,
    CONSTRAINT stats_person_all_time_mark_pkey PRIMARY KEY (listener_id, person_id),
    CONSTRAINT stats_person_all_time_mark_listener_id_fkey
        FOREIGN KEY (listener_id) REFERENCES listener_identity.stats_listener(listener_id) ON DELETE CASCADE,
    CONSTRAINT stats_person_all_time_mark_person_id_fkey
        FOREIGN KEY (person_id) REFERENCES public.person(id) ON DELETE CASCADE
);

CREATE TABLE public.stats_person_recommendation (
    listener_id uuid NOT NULL,
    person_id integer NOT NULL,
    score double precision NOT NULL,
    strength smallint NOT NULL,
    computed_at timestamp with time zone NOT NULL,
    CONSTRAINT stats_person_recommendation_pkey PRIMARY KEY (listener_id, person_id),
    CONSTRAINT stats_person_recommendation_score_check CHECK (score >= (0)::double precision),
    CONSTRAINT stats_person_recommendation_strength_check CHECK (strength >= 1 AND strength <= 5),
    CONSTRAINT stats_person_recommendation_listener_id_fkey
        FOREIGN KEY (listener_id) REFERENCES listener_identity.stats_listener(listener_id) ON DELETE CASCADE,
    CONSTRAINT stats_person_recommendation_person_id_fkey
        FOREIGN KEY (person_id) REFERENCES public.person(id) ON DELETE CASCADE
);

CREATE INDEX stats_person_recommendation_listener_score_idx
    ON public.stats_person_recommendation USING btree (listener_id, score DESC, person_id);

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.person TO podverse_app_read_write;
GRANT SELECT ON TABLE public.person TO podverse_app_read;
GRANT ALL ON SEQUENCE public.person_id_seq TO podverse_app_read_write;
GRANT SELECT ON SEQUENCE public.person_id_seq TO podverse_app_read;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_item_person_count TO podverse_app_read_write;
GRANT SELECT ON TABLE public.channel_item_person_count TO podverse_app_read;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_following_person TO podverse_app_read_write;
GRANT SELECT ON TABLE public.account_following_person TO podverse_app_read;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_daily_person TO podverse_app_read_write;
GRANT SELECT ON TABLE public.stats_daily_person TO podverse_app_read;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_popularity_person TO podverse_app_read_write;
GRANT SELECT ON TABLE public.stats_popularity_person TO podverse_app_read;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_person_all_time_mark TO podverse_app_read_write;
GRANT SELECT ON TABLE public.stats_person_all_time_mark TO podverse_app_read;

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_person_recommendation TO podverse_app_read_write;
GRANT SELECT ON TABLE public.stats_person_recommendation TO podverse_app_read;

GRANT EXECUTE ON FUNCTION public.person_name_key(text) TO podverse_app_read_write;
GRANT EXECUTE ON FUNCTION public.person_name_key(text) TO podverse_app_read;
