-- Shows a listener hid from Browse and Recommendations. Separate from Hidden From Taste Profile:
-- listening still updates taste rows, and subscriptions stay visible. The show stays out of
-- directory Browse and stored recommendations until unhidden.

--
-- Name: stats_channel_hidden; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_channel_hidden (
    listener_id uuid NOT NULL,
    channel_id integer NOT NULL,
    hidden_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stats_channel_hidden_pkey PRIMARY KEY (listener_id, channel_id),
    CONSTRAINT stats_channel_hidden_channel_id_fkey FOREIGN KEY (channel_id)
      REFERENCES public.channel(id) ON DELETE CASCADE,
    CONSTRAINT stats_channel_hidden_listener_id_fkey FOREIGN KEY (listener_id)
      REFERENCES listener_identity.stats_listener(listener_id) ON DELETE CASCADE
);

CREATE INDEX stats_channel_hidden_channel_id_idx
  ON public.stats_channel_hidden USING btree (channel_id);

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_channel_hidden TO podverse_app_read_write;
GRANT SELECT ON TABLE public.stats_channel_hidden TO podverse_app_read;
