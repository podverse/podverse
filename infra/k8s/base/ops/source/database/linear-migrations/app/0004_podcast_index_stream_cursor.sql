-- How far a worker has read a Podcast Index stream. One row per stream; the recent-feeds poller
-- keeps `recent_data` and resumes its next run from `next_since`, so a skipped or failed run does
-- not drop feed updates. Writers only move `next_since` forward.

--
-- Name: podcast_index_stream_cursor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.podcast_index_stream_cursor (
    stream_key public.varchar_short NOT NULL,
    next_since bigint NOT NULL,
    "position" bigint,
    updated_at public.server_time_with_default NOT NULL,
    CONSTRAINT podcast_index_stream_cursor_pkey PRIMARY KEY (stream_key)
);

CREATE TRIGGER set_updated_at_podcast_index_stream_cursor BEFORE UPDATE ON public.podcast_index_stream_cursor FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.podcast_index_stream_cursor TO podverse_app_read_write;
GRANT SELECT ON TABLE public.podcast_index_stream_cursor TO podverse_app_read;
