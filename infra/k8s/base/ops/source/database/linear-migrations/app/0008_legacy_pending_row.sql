-- legacy_pending_row records one account's v4 library row that the copy could not finish, so a
-- later replay can complete it. It stores ids and positions only (context: playlist id, list
-- position, playback position, order date, medium), never titles, urls, or emails.
--
-- legacy_id is the v4 id the row waits on: a podcast id (subscription), a user id
-- (follow_account), a mediaRef id (snapshot_clip), the mediaRef or episode id (history, queue,
-- now_playing), or `<playlist id>:<member id>` (playlist_clip, snapshot_playlist_member).
--
-- snapshot_* rows are clips and playlist members with no v5 item yet. A row the copy wrote with
-- removed_source is `resolved` with reason `snapshot`; one the copy could not write yet is
-- `unresolved`. Only history, queue, and now_playing become `dropped` for a missing item.

CREATE TABLE public.legacy_pending_row (
    id bigint GENERATED ALWAYS AS IDENTITY,
    account_id integer NOT NULL,
    row_kind text NOT NULL,
    legacy_id text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT legacy_pending_row_pkey PRIMARY KEY (id),
    CONSTRAINT legacy_pending_row_account_id_fkey
      FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE,
    CONSTRAINT legacy_pending_row_unique UNIQUE (account_id, row_kind, legacy_id),
    CONSTRAINT legacy_pending_row_status_check
      CHECK (status IN ('unresolved', 'resolved', 'dropped')),
    CONSTRAINT legacy_pending_row_kind_check
      CHECK (row_kind IN (
        'follow_account',
        'playlist_clip',
        'history',
        'queue',
        'now_playing',
        'snapshot_clip',
        'snapshot_playlist_member',
        'subscription'
      ))
);

CREATE INDEX legacy_pending_row_status_kind_idx
  ON public.legacy_pending_row USING btree (status, row_kind);

CREATE TRIGGER set_updated_at_legacy_pending_row
  BEFORE UPDATE ON public.legacy_pending_row
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.legacy_pending_row TO podverse_app_read_write;
GRANT SELECT ON TABLE public.legacy_pending_row TO podverse_app_read;
GRANT ALL ON SEQUENCE public.legacy_pending_row_id_seq TO podverse_app_read_write;
GRANT SELECT ON SEQUENCE public.legacy_pending_row_id_seq TO podverse_app_read;
