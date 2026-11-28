-- Authenticator secret for an admin account. Separate from listener accounts.

CREATE TABLE public.admin_second_factor (
    admin_account_id integer NOT NULL,
    secret_ciphertext text NOT NULL,
    pending_secret_ciphertext text,
    confirmed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_second_factor_pkey PRIMARY KEY (admin_account_id),
    CONSTRAINT admin_second_factor_admin_account_id_fkey FOREIGN KEY (admin_account_id) REFERENCES public.admin_account(id) ON DELETE CASCADE
);

CREATE TRIGGER set_updated_at_admin_second_factor
  BEFORE UPDATE ON public.admin_second_factor
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();

CREATE TABLE public.admin_second_factor_backup_code (
    id integer GENERATED ALWAYS AS IDENTITY,
    admin_account_id integer NOT NULL,
    code_hash character varying(64) NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_second_factor_backup_code_pkey PRIMARY KEY (id),
    CONSTRAINT admin_second_factor_backup_code_admin_account_id_fkey FOREIGN KEY (admin_account_id) REFERENCES public.admin_second_factor(admin_account_id) ON DELETE CASCADE
);

CREATE INDEX admin_second_factor_backup_code_admin_account_id_idx
  ON public.admin_second_factor_backup_code (admin_account_id);
