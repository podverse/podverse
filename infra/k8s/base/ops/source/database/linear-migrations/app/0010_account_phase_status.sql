-- One row per v4 user and migration phase. status is pending, done, failed,
-- deferred, or needs_operator. error_class is a short token. The row stores
-- the v4 user id and that token, never an email, a name, a password hash,
-- or a raw row.

CREATE TABLE public.account_phase_status (
    id bigint GENERATED ALWAYS AS IDENTITY,
    v4_user_id text NOT NULL,
    phase text NOT NULL,
    status text NOT NULL,
    account_id integer,
    error_class text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_phase_status_pkey PRIMARY KEY (id),
    CONSTRAINT account_phase_status_v4_user_phase_unique UNIQUE (v4_user_id, phase),
    CONSTRAINT account_phase_status_account_id_fkey
      FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE,
    CONSTRAINT account_phase_status_phase_check
      CHECK (phase IN (
        'identity', 'catalog', 'library', 'replay', 'membership', 'verify'
      )),
    CONSTRAINT account_phase_status_status_check
      CHECK (status IN (
        'pending', 'done', 'failed', 'deferred', 'needs_operator'
      )),
    CONSTRAINT account_phase_status_v4_user_id_check
      CHECK (
        char_length(v4_user_id) BETWEEN 1 AND 32
        AND v4_user_id !~ '[[:space:]@]'
      ),
    CONSTRAINT account_phase_status_error_class_check
      CHECK (
        error_class IS NULL
        OR (
          char_length(error_class) BETWEEN 1 AND 80
          AND error_class ~ '^[A-Za-z0-9_:]+$'
        )
      ),
    CONSTRAINT account_phase_status_error_class_status_check
      CHECK (
        (
          status IN ('pending', 'done')
          AND error_class IS NULL
        )
        OR (
          status IN ('failed', 'deferred', 'needs_operator')
          AND error_class IS NOT NULL
        )
      )
);

CREATE INDEX account_phase_status_phase_status_idx
  ON public.account_phase_status USING btree (phase, status);

CREATE INDEX account_phase_status_account_id_idx
  ON public.account_phase_status USING btree (account_id)
  WHERE account_id IS NOT NULL;

CREATE TRIGGER set_updated_at_account_phase_status
  BEFORE UPDATE ON public.account_phase_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_phase_status TO podverse_app_read_write;
GRANT SELECT ON TABLE public.account_phase_status TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_phase_status_id_seq TO podverse_app_read_write;
GRANT SELECT ON SEQUENCE public.account_phase_status_id_seq TO podverse_app_read;
