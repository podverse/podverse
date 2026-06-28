-- GENERATED FILE (do not edit) — see scripts/database/squash-linear-migrations.sh

-- Management schema + reference data (apply after 0000_init_helpers.sql).

--
-- PostgreSQL database dump
--


-- Dumped from database version 18.3 (Debian 18.3-1.pgdg13+1)
-- Dumped by pg_dump version 18.3 (Debian 18.3-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: nano_id_v2; Type: DOMAIN; Schema: public; Owner: -
--



--
-- Name: server_time_with_default; Type: DOMAIN; Schema: public; Owner: -
--



--
-- Name: varchar_email; Type: DOMAIN; Schema: public; Owner: -
--



--
-- Name: varchar_password; Type: DOMAIN; Schema: public; Owner: -
--




SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_account (
    id integer NOT NULL,
    id_text public.nano_id_v2 NOT NULL,
    admin_account_role_id integer DEFAULT 2 NOT NULL,
    created_at public.server_time_with_default,
    updated_at public.server_time_with_default
);


--
-- Name: admin_account_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_account_credentials (
    id integer NOT NULL,
    admin_account_id integer NOT NULL,
    email public.varchar_email,
    password public.varchar_password NOT NULL,
    username character varying(64),
    CONSTRAINT admin_account_credentials_email_or_username_check CHECK (((email IS NOT NULL) OR (username IS NOT NULL))),
    CONSTRAINT admin_account_credentials_username_length_check CHECK (((username IS NULL) OR ((char_length((username)::text) >= 1) AND (char_length((username)::text) <= 64))))
);


--
-- Name: admin_account_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_account_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_account_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_account_credentials_id_seq OWNED BY public.admin_account_credentials.id;


--
-- Name: admin_account_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_account_id_seq OWNED BY public.admin_account.id;


--
-- Name: admin_account_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_account_permissions (
    id integer NOT NULL,
    admin_account_id integer NOT NULL,
    feeds_crud integer DEFAULT 0 NOT NULL,
    admins_crud integer DEFAULT 0 NOT NULL,
    stats_crud integer DEFAULT 0 NOT NULL,
    created_at public.server_time_with_default,
    updated_at public.server_time_with_default,
    feed_takedown_reasons_crud integer DEFAULT 0 NOT NULL,
    billing_prices_crud integer DEFAULT 0 NOT NULL,
    bucket_crud integer DEFAULT 0 NOT NULL,
    embed_demo_crud integer DEFAULT 0 NOT NULL,
    CONSTRAINT admin_account_permissions_admins_crud_check CHECK (((admins_crud >= 0) AND (admins_crud <= 15))),
    CONSTRAINT admin_account_permissions_bucket_crud_check CHECK (((bucket_crud >= 0) AND (bucket_crud <= 15))),
    CONSTRAINT admin_account_permissions_feed_takedown_reasons_crud_check CHECK (((feed_takedown_reasons_crud >= 0) AND (feed_takedown_reasons_crud <= 15))),
    CONSTRAINT admin_account_permissions_feeds_crud_check CHECK (((feeds_crud >= 0) AND (feeds_crud <= 15))),
    CONSTRAINT admin_account_permissions_stats_crud_check CHECK (((stats_crud >= 0) AND (stats_crud <= 15)))
);


--
-- Name: admin_account_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_account_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_account_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_account_permissions_id_seq OWNED BY public.admin_account_permissions.id;


--
-- Name: admin_account_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_account_role (
    id integer NOT NULL,
    role character varying(20) NOT NULL,
    created_at public.server_time_with_default,
    updated_at public.server_time_with_default,
    CONSTRAINT admin_account_role_role_check CHECK (((role)::text = ANY ((ARRAY['superuser'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: admin_account_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_account_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_account_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_account_role_id_seq OWNED BY public.admin_account_role.id;


--
-- Name: admin_account_set_password; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_account_set_password (
    id integer NOT NULL,
    admin_account_id integer NOT NULL,
    set_password_token character varying(36) NOT NULL,
    set_password_token_expires_at timestamp without time zone CONSTRAINT admin_account_set_password_set_password_token_expires__not_null NOT NULL
);


--
-- Name: admin_account_set_password_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_account_set_password_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_account_set_password_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_account_set_password_id_seq OWNED BY public.admin_account_set_password.id;


--
-- Name: database_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.database_audit_log (
    id bigint NOT NULL,
    admin_account_id integer NOT NULL,
    operation character varying(10) NOT NULL,
    table_name character varying(100) NOT NULL,
    row_id integer NOT NULL,
    before_snapshot jsonb,
    after_snapshot jsonb,
    request_id character varying(64),
    created_at public.server_time_with_default,
    CONSTRAINT database_audit_log_operation_check CHECK (((operation)::text = ANY ((ARRAY['create'::character varying, 'update'::character varying, 'delete'::character varying])::text[])))
);


--
-- Name: database_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.database_audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: database_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.database_audit_log_id_seq OWNED BY public.database_audit_log.id;



--
-- Name: management_admin_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.management_admin_role (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    feeds_crud integer NOT NULL,
    feed_takedown_reasons_crud integer NOT NULL,
    admins_crud integer NOT NULL,
    stats_crud integer NOT NULL,
    billing_prices_crud integer NOT NULL,
    bucket_crud integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    embed_demo_crud integer DEFAULT 0 NOT NULL,
    CONSTRAINT management_admin_role_admins_crud_check CHECK (((admins_crud >= 0) AND (admins_crud <= 15))),
    CONSTRAINT management_admin_role_billing_prices_crud_check CHECK (((billing_prices_crud >= 0) AND (billing_prices_crud <= 15))),
    CONSTRAINT management_admin_role_bucket_crud_check CHECK (((bucket_crud >= 0) AND (bucket_crud <= 15))),
    CONSTRAINT management_admin_role_embed_demo_crud_check CHECK (((embed_demo_crud >= 0) AND (embed_demo_crud <= 15))),
    CONSTRAINT management_admin_role_feed_takedown_reasons_crud_check CHECK (((feed_takedown_reasons_crud >= 0) AND (feed_takedown_reasons_crud <= 15))),
    CONSTRAINT management_admin_role_feeds_crud_check CHECK (((feeds_crud >= 0) AND (feeds_crud <= 15))),
    CONSTRAINT management_admin_role_stats_crud_check CHECK (((stats_crud >= 0) AND (stats_crud <= 15)))
);


--
-- Name: admin_account id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account ALTER COLUMN id SET DEFAULT nextval('public.admin_account_id_seq'::regclass);


--
-- Name: admin_account_credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_credentials ALTER COLUMN id SET DEFAULT nextval('public.admin_account_credentials_id_seq'::regclass);


--
-- Name: admin_account_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_permissions ALTER COLUMN id SET DEFAULT nextval('public.admin_account_permissions_id_seq'::regclass);


--
-- Name: admin_account_role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_role ALTER COLUMN id SET DEFAULT nextval('public.admin_account_role_id_seq'::regclass);


--
-- Name: admin_account_set_password id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_set_password ALTER COLUMN id SET DEFAULT nextval('public.admin_account_set_password_id_seq'::regclass);


--
-- Name: database_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.database_audit_log ALTER COLUMN id SET DEFAULT nextval('public.database_audit_log_id_seq'::regclass);


--
-- Data for Name: admin_account; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_account (id, id_text, admin_account_role_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_account_credentials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_account_credentials (id, admin_account_id, email, password, username) FROM stdin;
\.


--
-- Data for Name: admin_account_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_account_permissions (id, admin_account_id, feeds_crud, admins_crud, stats_crud, created_at, updated_at, feed_takedown_reasons_crud, billing_prices_crud, bucket_crud, embed_demo_crud) FROM stdin;
\.


--
-- Data for Name: admin_account_role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_account_role (id, role, created_at, updated_at) FROM stdin;
1	superuser	2000-01-01 00:00:00	2000-01-01 00:00:00
2	admin	2000-01-01 00:00:00	2000-01-01 00:00:00
\.


--
-- Data for Name: admin_account_set_password; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_account_set_password (id, admin_account_id, set_password_token, set_password_token_expires_at) FROM stdin;
\.


--
-- Data for Name: database_audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.database_audit_log (id, admin_account_id, operation, table_name, row_id, before_snapshot, after_snapshot, request_id, created_at) FROM stdin;
\.


--
-- Data for Name: management_admin_role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.management_admin_role (id, name, feeds_crud, feed_takedown_reasons_crud, admins_crud, stats_crud, billing_prices_crud, bucket_crud, created_at, embed_demo_crud) FROM stdin;
\.


--
-- Name: admin_account_credentials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_account_credentials_id_seq', 1, false);


--
-- Name: admin_account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_account_id_seq', 1, false);


--
-- Name: admin_account_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_account_permissions_id_seq', 1, false);


--
-- Name: admin_account_role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_account_role_id_seq', 1, false);


--
-- Name: admin_account_set_password_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_account_set_password_id_seq', 1, false);


--
-- Name: database_audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.database_audit_log_id_seq', 1, false);



--
-- Name: admin_account_credentials admin_account_credentials_admin_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_credentials
    ADD CONSTRAINT admin_account_credentials_admin_account_id_key UNIQUE (admin_account_id);


--
-- Name: admin_account_credentials admin_account_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_credentials
    ADD CONSTRAINT admin_account_credentials_pkey PRIMARY KEY (id);


--
-- Name: admin_account admin_account_id_text_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account
    ADD CONSTRAINT admin_account_id_text_key UNIQUE (id_text);


--
-- Name: admin_account_permissions admin_account_permissions_admin_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_permissions
    ADD CONSTRAINT admin_account_permissions_admin_account_id_key UNIQUE (admin_account_id);


--
-- Name: admin_account_permissions admin_account_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_permissions
    ADD CONSTRAINT admin_account_permissions_pkey PRIMARY KEY (id);


--
-- Name: admin_account admin_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account
    ADD CONSTRAINT admin_account_pkey PRIMARY KEY (id);


--
-- Name: admin_account_role admin_account_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_role
    ADD CONSTRAINT admin_account_role_pkey PRIMARY KEY (id);


--
-- Name: admin_account_role admin_account_role_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_role
    ADD CONSTRAINT admin_account_role_role_key UNIQUE (role);


--
-- Name: admin_account_set_password admin_account_set_password_admin_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_set_password
    ADD CONSTRAINT admin_account_set_password_admin_account_id_key UNIQUE (admin_account_id);


--
-- Name: admin_account_set_password admin_account_set_password_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_set_password
    ADD CONSTRAINT admin_account_set_password_pkey PRIMARY KEY (id);


--
-- Name: database_audit_log database_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.database_audit_log
    ADD CONSTRAINT database_audit_log_pkey PRIMARY KEY (id);


--
-- Name: management_admin_role management_admin_role_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.management_admin_role
    ADD CONSTRAINT management_admin_role_name_key UNIQUE (name);


--
-- Name: management_admin_role management_admin_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.management_admin_role
    ADD CONSTRAINT management_admin_role_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_account_admin_account_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_account_admin_account_role_id ON public.admin_account USING btree (admin_account_role_id);


--
-- Name: idx_admin_account_credentials_admin_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_account_credentials_admin_account_id ON public.admin_account_credentials USING btree (admin_account_id);


--
-- Name: idx_admin_account_permissions_admin_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_account_permissions_admin_account_id ON public.admin_account_permissions USING btree (admin_account_id);


--
-- Name: idx_admin_account_set_password_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_admin_account_set_password_token ON public.admin_account_set_password USING btree (set_password_token);


--
-- Name: idx_database_audit_log_admin_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_database_audit_log_admin_account_id ON public.database_audit_log USING btree (admin_account_id);


--
-- Name: idx_database_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_database_audit_log_created_at ON public.database_audit_log USING btree (created_at);


--
-- Name: idx_database_audit_log_table_name_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_database_audit_log_table_name_row_id ON public.database_audit_log USING btree (table_name, row_id);


--
-- Name: uq_admin_account_credentials_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_admin_account_credentials_email ON public.admin_account_credentials USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: uq_admin_account_credentials_username_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_admin_account_credentials_username_lower ON public.admin_account_credentials USING btree (lower((username)::text)) WHERE (username IS NOT NULL);


--
-- Name: admin_account set_updated_at_admin_account; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_admin_account BEFORE UPDATE ON public.admin_account FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();


--
-- Name: admin_account_permissions set_updated_at_admin_account_permissions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_admin_account_permissions BEFORE UPDATE ON public.admin_account_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();


--
-- Name: admin_account_role set_updated_at_admin_account_role; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_admin_account_role BEFORE UPDATE ON public.admin_account_role FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();


--
-- Name: admin_account admin_account_admin_account_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account
    ADD CONSTRAINT admin_account_admin_account_role_id_fkey FOREIGN KEY (admin_account_role_id) REFERENCES public.admin_account_role(id);


--
-- Name: admin_account_credentials admin_account_credentials_admin_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_credentials
    ADD CONSTRAINT admin_account_credentials_admin_account_id_fkey FOREIGN KEY (admin_account_id) REFERENCES public.admin_account(id) ON DELETE CASCADE;


--
-- Name: admin_account_permissions admin_account_permissions_admin_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_permissions
    ADD CONSTRAINT admin_account_permissions_admin_account_id_fkey FOREIGN KEY (admin_account_id) REFERENCES public.admin_account(id) ON DELETE CASCADE;


--
-- Name: admin_account_set_password admin_account_set_password_admin_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_set_password
    ADD CONSTRAINT admin_account_set_password_admin_account_id_fkey FOREIGN KEY (admin_account_id) REFERENCES public.admin_account(id) ON DELETE CASCADE;


--
-- Name: database_audit_log database_audit_log_admin_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.database_audit_log
    ADD CONSTRAINT database_audit_log_admin_account_id_fkey FOREIGN KEY (admin_account_id) REFERENCES public.admin_account(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT ALL ON SCHEMA public TO podverse_management_migrator;
GRANT USAGE ON SCHEMA public TO podverse_management_read_write;
GRANT USAGE ON SCHEMA public TO podverse_management_read;


--
-- Name: TABLE admin_account; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admin_account TO podverse_management_read_write;
GRANT SELECT ON TABLE public.admin_account TO podverse_management_read;


--
-- Name: TABLE admin_account_credentials; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admin_account_credentials TO podverse_management_read_write;
GRANT SELECT ON TABLE public.admin_account_credentials TO podverse_management_read;


--
-- Name: SEQUENCE admin_account_credentials_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.admin_account_credentials_id_seq TO podverse_management_read_write;
GRANT SELECT ON SEQUENCE public.admin_account_credentials_id_seq TO podverse_management_read;


--
-- Name: SEQUENCE admin_account_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.admin_account_id_seq TO podverse_management_read_write;
GRANT SELECT ON SEQUENCE public.admin_account_id_seq TO podverse_management_read;


--
-- Name: TABLE admin_account_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admin_account_permissions TO podverse_management_read_write;
GRANT SELECT ON TABLE public.admin_account_permissions TO podverse_management_read;


--
-- Name: SEQUENCE admin_account_permissions_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.admin_account_permissions_id_seq TO podverse_management_read_write;
GRANT SELECT ON SEQUENCE public.admin_account_permissions_id_seq TO podverse_management_read;


--
-- Name: TABLE admin_account_role; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admin_account_role TO podverse_management_read_write;
GRANT SELECT ON TABLE public.admin_account_role TO podverse_management_read;


--
-- Name: SEQUENCE admin_account_role_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.admin_account_role_id_seq TO podverse_management_read_write;
GRANT SELECT ON SEQUENCE public.admin_account_role_id_seq TO podverse_management_read;


--
-- Name: TABLE admin_account_set_password; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admin_account_set_password TO podverse_management_read_write;
GRANT SELECT ON TABLE public.admin_account_set_password TO podverse_management_read;


--
-- Name: SEQUENCE admin_account_set_password_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.admin_account_set_password_id_seq TO podverse_management_read_write;
GRANT SELECT ON SEQUENCE public.admin_account_set_password_id_seq TO podverse_management_read;


--
-- Name: TABLE database_audit_log; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.database_audit_log TO podverse_management_read_write;
GRANT SELECT ON TABLE public.database_audit_log TO podverse_management_read;


--
-- Name: SEQUENCE database_audit_log_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.database_audit_log_id_seq TO podverse_management_read_write;
GRANT SELECT ON SEQUENCE public.database_audit_log_id_seq TO podverse_management_read;



--
-- Name: TABLE management_admin_role; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.management_admin_role TO podverse_management_read_write;
GRANT SELECT ON TABLE public.management_admin_role TO podverse_management_read;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE podverse_management_migrator IN SCHEMA public GRANT ALL ON SEQUENCES TO podverse_management_read_write;
ALTER DEFAULT PRIVILEGES FOR ROLE podverse_management_migrator IN SCHEMA public GRANT SELECT ON SEQUENCES TO podverse_management_read;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE podverse_management_migrator IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO podverse_management_read_write;
ALTER DEFAULT PRIVILEGES FOR ROLE podverse_management_migrator IN SCHEMA public GRANT SELECT ON TABLES TO podverse_management_read;


--
-- PostgreSQL database dump complete
--



