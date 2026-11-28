-- Authenticator secret for an account, plus one-time backup codes. The secret is ciphertext.
-- confirmed_at stays null until an app code matches. pending_secret_ciphertext holds a
-- replacement until that code matches.

CREATE TABLE public.account_second_factor (
    account_id integer NOT NULL,
    secret_ciphertext text NOT NULL,
    pending_secret_ciphertext text,
    confirmed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_second_factor_pkey PRIMARY KEY (account_id),
    CONSTRAINT account_second_factor_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE
);

CREATE TRIGGER set_updated_at_account_second_factor
  BEFORE UPDATE ON public.account_second_factor
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();

CREATE TABLE public.account_second_factor_backup_code (
    id integer GENERATED ALWAYS AS IDENTITY,
    account_id integer NOT NULL,
    code_hash character varying(64) NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_second_factor_backup_code_pkey PRIMARY KEY (id),
    CONSTRAINT account_second_factor_backup_code_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account_second_factor(account_id) ON DELETE CASCADE
);

CREATE INDEX account_second_factor_backup_code_account_id_idx
  ON public.account_second_factor_backup_code (account_id);
