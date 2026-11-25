-- Podcast Index ids this instance is allowed to add. The deployment list is synced from
-- CATALOG_PODCAST_INDEX_ID_ALLOWLIST. Management additions stay until an admin removes them.
-- resolved_podcast_index_id is the current id when the directory moved the listed id.

CREATE TABLE public.catalog_podcast_index_allowlist (
    podcast_index_id integer NOT NULL,
    resolved_podcast_index_id integer,
    origin text NOT NULL,
    title text,
    feed_url text,
    created_by_admin_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT catalog_podcast_index_allowlist_pkey PRIMARY KEY (podcast_index_id),
    CONSTRAINT catalog_podcast_index_allowlist_podcast_index_id_check CHECK (podcast_index_id > 0),
    CONSTRAINT catalog_podcast_index_allowlist_origin_check CHECK (origin IN ('deployment', 'admin')),
    CONSTRAINT catalog_podcast_index_allowlist_resolved_check CHECK (
      resolved_podcast_index_id IS NULL
      OR (
        resolved_podcast_index_id > 0
        AND resolved_podcast_index_id <> podcast_index_id
      )
    )
);

CREATE INDEX catalog_podcast_index_allowlist_resolved_podcast_index_id_idx
  ON public.catalog_podcast_index_allowlist (resolved_podcast_index_id);

CREATE TRIGGER set_updated_at_catalog_podcast_index_allowlist
  BEFORE UPDATE ON public.catalog_podcast_index_allowlist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();

GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE public.catalog_podcast_index_allowlist TO podverse_app_read_write;
GRANT SELECT ON TABLE public.catalog_podcast_index_allowlist TO podverse_app_read;
