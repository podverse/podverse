-- Public ids can be 7 characters. Generated ids stay 10.
-- v4_library_copied_at is null until that account's library has been copied.
-- legacy_id_map records a v4 id and the v5 id it resolved to. It stores ids only.

ALTER DOMAIN public.nano_id_v2 DROP CONSTRAINT nano_id_v2_len_check;
ALTER DOMAIN public.nano_id_v2 ADD CONSTRAINT nano_id_v2_len_check
  CHECK (VALUE IS NULL OR (char_length(VALUE) >= 7 AND char_length(VALUE) <= 15));

ALTER TABLE public.account ADD COLUMN v4_library_copied_at timestamp with time zone;

CREATE TABLE public.legacy_id_map (
    id bigint GENERATED ALWAYS AS IDENTITY,
    legacy_kind text NOT NULL,
    legacy_id text NOT NULL,
    v5_kind text NOT NULL,
    v5_id_text public.nano_id_v2,
    resolve_key text,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT legacy_id_map_pkey PRIMARY KEY (id),
    CONSTRAINT legacy_id_map_legacy_unique UNIQUE (legacy_kind, legacy_id),
    CONSTRAINT legacy_id_map_status_check
      CHECK (status IN ('mapped', 'unresolved', 'dropped')),
    CONSTRAINT legacy_id_map_legacy_kind_check
      CHECK (legacy_kind IN ('podcast', 'episode', 'mediaRef', 'playlist', 'user')),
    CONSTRAINT legacy_id_map_v5_kind_check
      CHECK (v5_kind IN (
        'channel', 'item', 'clip', 'item_chapter', 'item_soundbite', 'playlist', 'account'
      ))
);

CREATE INDEX legacy_id_map_v5_idx ON public.legacy_id_map USING btree (v5_kind, v5_id_text);

CREATE TRIGGER set_updated_at_legacy_id_map
  BEFORE UPDATE ON public.legacy_id_map
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.legacy_id_map TO podverse_app_read_write;
GRANT SELECT ON TABLE public.legacy_id_map TO podverse_app_read;
GRANT ALL ON SEQUENCE public.legacy_id_map_id_seq TO podverse_app_read_write;
GRANT SELECT ON SEQUENCE public.legacy_id_map_id_seq TO podverse_app_read;
