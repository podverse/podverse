-- GENERATED FILE (do not edit) — see scripts/database/generate-linear-baseline.sh and docs/operations/LINEAR-MIGRATIONS.md

\connect podverse_app

--
-- PostgreSQL database dump
--


-- Dumped from database version 18.1 (Debian 18.1-1.pgdg13+2)
-- Dumped by pg_dump version 18.1 (Debian 18.1-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: account_fcm_device_platform_options; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_fcm_device_platform_options AS ENUM (
    'web',
    'ios',
    'android'
);


--
-- Name: list_position; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.list_position AS numeric(22,21);


--
-- Name: media_player_time; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.media_player_time AS numeric(10,2);


--
-- Name: nano_id_v2; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.nano_id_v2 AS character varying(15)
	CONSTRAINT nano_id_v2_len_check CHECK (((VALUE IS NULL) OR ((char_length((VALUE)::text) >= 9) AND (char_length((VALUE)::text) <= 15))));


--
-- Name: notification_channel_type_options; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_channel_type_options AS ENUM (
    'new-item',
    'livestream-scheduled',
    'livestream-started'
);


--
-- Name: numeric_20_11; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.numeric_20_11 AS numeric(20,11);


--
-- Name: on_demand_parser_event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.on_demand_parser_event_type AS ENUM (
    'add',
    'refresh',
    'remoteItem'
);


--
-- Name: server_time; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.server_time AS timestamp without time zone;


--
-- Name: server_time_with_default; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.server_time_with_default AS timestamp without time zone DEFAULT now();


--
-- Name: varchar_email; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_email AS character varying(255)
	CONSTRAINT varchar_email_check CHECK (((VALUE)::text ~ '^.+@.+\..+$'::text));


--
-- Name: varchar_fcm_token; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_fcm_token AS character varying(255);


--
-- Name: varchar_fqdn; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_fqdn AS character varying(253);


--
-- Name: varchar_guid; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_guid AS character varying(36);


--
-- Name: varchar_locale; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_locale AS character varying(85);


--
-- Name: varchar_long; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_long AS character varying(2500);


--
-- Name: varchar_longer; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_longer AS character varying(10000);


--
-- Name: varchar_md5; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_md5 AS character varying(32);


--
-- Name: varchar_normal; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_normal AS character varying(255);


--
-- Name: varchar_password; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_password AS character varying(60);


--
-- Name: varchar_short; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_short AS character varying(50);


--
-- Name: varchar_slug; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_slug AS character varying(100);


--
-- Name: varchar_uri; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_uri AS character varying(2083);


--
-- Name: varchar_url; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_url AS character varying(2083)
	CONSTRAINT varchar_url_check CHECK (((VALUE)::text ~ '^https?://|^http?://'::text));


--
-- Name: enforce_playlist_resource_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_playlist_resource_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    resource_count INTEGER;
    max_resources CONSTANT INTEGER := 10000;
BEGIN
    SELECT COUNT(*) INTO resource_count
    FROM playlist_resource
    WHERE playlist_id = NEW.playlist_id;

    IF resource_count >= max_resources THEN
        RAISE EXCEPTION 'Playlist % cannot have more than % resources', NEW.playlist_id, max_resources;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: enforce_queue_resource_limit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_queue_resource_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    resource_count INTEGER;
    max_resources CONSTANT INTEGER := 10000;
    min_id INTEGER;
BEGIN
    SELECT COUNT(*) INTO resource_count
    FROM queue_resource
    WHERE queue_id = NEW.queue_id;

    IF resource_count >= max_resources THEN
        -- Find the id of the resource with the lowest list_position
        SELECT id INTO min_id
        FROM queue_resource
        WHERE queue_id = NEW.queue_id
        ORDER BY list_position ASC
        LIMIT 1;

        IF min_id IS NOT NULL THEN
            DELETE FROM queue_resource WHERE id = min_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: set_updated_at_field(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_field() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    id integer NOT NULL,
    id_text public.nano_id_v2 NOT NULL,
    verified boolean DEFAULT false,
    sharable_status_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: account_app_store_purchase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_app_store_purchase (
    account_id integer NOT NULL,
    transaction_id character varying NOT NULL,
    cancellation_date character varying,
    cancellation_date_ms character varying,
    cancellation_date_pst character varying,
    cancellation_reason character varying,
    expires_date character varying,
    expires_date_ms character varying,
    expires_date_pst character varying,
    is_in_intro_offer_period boolean,
    is_trial_period boolean,
    original_purchase_date character varying,
    original_purchase_date_ms character varying,
    original_purchase_date_pst character varying,
    original_transaction_id character varying,
    product_id character varying,
    promotional_offer_id character varying,
    purchase_date character varying,
    purchase_date_ms character varying,
    purchase_date_pst character varying,
    quantity integer,
    web_order_line_item_id character varying
);


--
-- Name: account_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_credentials (
    id integer NOT NULL,
    account_id integer NOT NULL,
    email public.varchar_email,
    username character varying(32),
    password public.varchar_password NOT NULL,
    CONSTRAINT account_credentials_username_check CHECK ((length((username)::text) >= 3)),
    CONSTRAINT chk_account_credentials_email_or_username CHECK (((email IS NOT NULL) OR (username IS NOT NULL)))
);


--
-- Name: account_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_credentials_id_seq OWNED BY public.account_credentials.id;


--
-- Name: account_email_change_verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_email_change_verification (
    id integer NOT NULL,
    account_id integer NOT NULL,
    verification_token public.varchar_guid,
    verification_token_expires_at timestamp without time zone,
    pending_email_address public.varchar_email
);


--
-- Name: account_email_change_verification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_email_change_verification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_email_change_verification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_email_change_verification_id_seq OWNED BY public.account_email_change_verification.id;


--
-- Name: account_fcm_device; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_fcm_device (
    id integer NOT NULL,
    account_id integer NOT NULL,
    fcm_token public.varchar_fcm_token NOT NULL,
    installation_id public.varchar_guid NOT NULL,
    platform public.account_fcm_device_platform_options NOT NULL,
    locale public.varchar_locale NOT NULL,
    created_at public.server_time_with_default NOT NULL,
    updated_at public.server_time_with_default NOT NULL
);


--
-- Name: account_fcm_device_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_fcm_device_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_fcm_device_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_fcm_device_id_seq OWNED BY public.account_fcm_device.id;


--
-- Name: account_following_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_following_account (
    account_id integer NOT NULL,
    following_account_id integer NOT NULL
);


--
-- Name: account_following_add_by_rss_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_following_add_by_rss_channel (
    account_id integer NOT NULL,
    feed_url public.varchar_url NOT NULL,
    title public.varchar_normal,
    image_url public.varchar_url,
    basic_auth_username public.varchar_normal,
    basic_auth_password public.varchar_normal
);


--
-- Name: account_following_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_following_channel (
    account_id integer NOT NULL,
    channel_id integer NOT NULL
);


--
-- Name: account_following_playlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_following_playlist (
    account_id integer NOT NULL,
    playlist_id integer NOT NULL
);


--
-- Name: account_google_play_purchase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_google_play_purchase (
    account_id integer NOT NULL,
    transaction_id character varying NOT NULL,
    acknowledgement_state integer,
    consumption_state integer,
    developer_payload character varying,
    kind character varying,
    product_id character varying NOT NULL,
    purchase_time_millis character varying,
    purchase_state integer,
    purchase_token character varying NOT NULL
);


--
-- Name: account_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_id_seq OWNED BY public.account.id;


--
-- Name: account_membership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_membership (
    id integer NOT NULL,
    tier text,
    CONSTRAINT account_membership_tier_check CHECK ((tier = ANY (ARRAY['trial'::text, 'basic'::text])))
);


--
-- Name: account_membership_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_membership_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_membership_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_membership_id_seq OWNED BY public.account_membership.id;


--
-- Name: account_membership_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_membership_status (
    id integer NOT NULL,
    account_id integer NOT NULL,
    account_membership_id integer NOT NULL,
    membership_expires_at timestamp without time zone,
    auto_renew boolean DEFAULT false
);


--
-- Name: account_membership_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_membership_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_membership_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_membership_status_id_seq OWNED BY public.account_membership_status.id;


--
-- Name: account_metaboost; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_metaboost (
    account_id integer NOT NULL,
    sender_guid uuid NOT NULL
);


--
-- Name: account_notification_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_notification_channel (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    account_id integer NOT NULL
);


--
-- Name: account_notification_channel_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_notification_channel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_notification_channel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_notification_channel_id_seq OWNED BY public.account_notification_channel.id;


--
-- Name: account_notification_channel_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_notification_channel_type (
    id integer NOT NULL,
    account_notification_channel_id integer CONSTRAINT account_notification_channe_account_notification_chann_not_null NOT NULL,
    type public.notification_channel_type_options NOT NULL
);


--
-- Name: account_notification_channel_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_notification_channel_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_notification_channel_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_notification_channel_type_id_seq OWNED BY public.account_notification_channel_type.id;


--
-- Name: account_paypal_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_paypal_order (
    account_id integer NOT NULL,
    payment_id character varying NOT NULL,
    state character varying
);


--
-- Name: account_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_profile (
    id integer NOT NULL,
    account_id integer NOT NULL,
    display_name public.varchar_normal,
    bio public.varchar_long
);


--
-- Name: account_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_profile_id_seq OWNED BY public.account_profile.id;


--
-- Name: account_reset_password; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_reset_password (
    id integer NOT NULL,
    account_id integer NOT NULL,
    reset_token public.varchar_guid,
    reset_token_expires_at timestamp without time zone
);


--
-- Name: account_reset_password_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_reset_password_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_reset_password_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_reset_password_id_seq OWNED BY public.account_reset_password.id;


--
-- Name: account_set_password; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_set_password (
    id integer NOT NULL,
    account_id integer NOT NULL,
    set_password_token public.varchar_guid,
    set_password_token_expires_at timestamp without time zone
);


--
-- Name: account_set_password_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_set_password_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_set_password_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_set_password_id_seq OWNED BY public.account_set_password.id;


--
-- Name: account_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_settings (
    id integer NOT NULL,
    account_id integer NOT NULL
);


--
-- Name: account_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_settings_id_seq OWNED BY public.account_settings.id;


--
-- Name: account_settings_locale; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_settings_locale (
    id integer NOT NULL,
    account_settings_id integer NOT NULL,
    locale public.varchar_locale DEFAULT 'en-US'::character varying NOT NULL
);


--
-- Name: account_settings_locale_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_settings_locale_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_settings_locale_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_settings_locale_id_seq OWNED BY public.account_settings_locale.id;


--
-- Name: account_settings_notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_settings_notification (
    id integer NOT NULL,
    account_settings_id integer NOT NULL
);


--
-- Name: account_settings_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_settings_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_settings_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_settings_notification_id_seq OWNED BY public.account_settings_notification.id;


--
-- Name: account_settings_notification_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_settings_notification_type (
    id integer NOT NULL,
    account_settings_notification_id integer CONSTRAINT account_settings_notificati_account_settings_notificat_not_null NOT NULL,
    type public.notification_channel_type_options NOT NULL
);


--
-- Name: account_settings_notification_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_settings_notification_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_settings_notification_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_settings_notification_type_id_seq OWNED BY public.account_settings_notification_type.id;


--
-- Name: account_up_device; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_up_device (
    id integer NOT NULL,
    account_id integer NOT NULL,
    up_endpoint public.varchar_url NOT NULL,
    up_auth_key public.varchar_long,
    locale public.varchar_locale NOT NULL,
    created_at public.server_time_with_default NOT NULL,
    updated_at public.server_time_with_default NOT NULL
);


--
-- Name: account_up_device_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_up_device_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_up_device_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_up_device_id_seq OWNED BY public.account_up_device.id;


--
-- Name: account_verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_verification (
    id integer NOT NULL,
    account_id integer NOT NULL,
    verification_token public.varchar_guid,
    verification_token_expires_at timestamp without time zone
);


--
-- Name: account_verification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_verification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_verification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_verification_id_seq OWNED BY public.account_verification.id;


--
-- Name: account_webpush_device; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_webpush_device (
    id integer NOT NULL,
    account_id integer NOT NULL,
    endpoint public.varchar_url NOT NULL,
    p256dh public.varchar_long NOT NULL,
    auth public.varchar_long NOT NULL,
    locale public.varchar_locale NOT NULL,
    created_at public.server_time_with_default NOT NULL,
    updated_at public.server_time_with_default NOT NULL
);


--
-- Name: account_webpush_device_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_webpush_device_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_webpush_device_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_webpush_device_id_seq OWNED BY public.account_webpush_device.id;


--
-- Name: category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category (
    id integer NOT NULL,
    parent_id integer,
    display_name public.varchar_normal NOT NULL,
    slug public.varchar_normal NOT NULL,
    mapping_key public.varchar_normal NOT NULL
);


--
-- Name: category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.category_id_seq OWNED BY public.category.id;


--
-- Name: channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel (
    id integer NOT NULL,
    id_text public.nano_id_v2 NOT NULL,
    slug public.varchar_slug,
    feed_id integer NOT NULL,
    podcast_guid uuid,
    title public.varchar_normal,
    sortable_title public.varchar_short,
    medium_id integer NOT NULL,
    has_podcast_index_value boolean DEFAULT false,
    has_value_time_splits boolean DEFAULT false
);


--
-- Name: channel_about; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_about (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    author public.varchar_normal,
    episode_count integer,
    explicit boolean,
    itunes_type_id integer,
    language public.varchar_short,
    last_pub_date public.server_time_with_default,
    website_link_url public.varchar_url
);


--
-- Name: channel_about_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_about_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_about_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_about_id_seq OWNED BY public.channel_about.id;


--
-- Name: channel_category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_category (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    category_id integer NOT NULL
);


--
-- Name: channel_category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_category_id_seq OWNED BY public.channel_category.id;


--
-- Name: channel_chat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_chat (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    server public.varchar_fqdn NOT NULL,
    protocol public.varchar_short NOT NULL,
    account_id public.varchar_normal,
    space public.varchar_normal
);


--
-- Name: channel_chat_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_chat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_chat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_chat_id_seq OWNED BY public.channel_chat.id;


--
-- Name: channel_description; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_description (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    value public.varchar_longer NOT NULL
);


--
-- Name: channel_description_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_description_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_description_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_description_id_seq OWNED BY public.channel_description.id;


--
-- Name: channel_funding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_funding (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    url public.varchar_url NOT NULL,
    title public.varchar_normal
);


--
-- Name: channel_funding_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_funding_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_funding_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_funding_id_seq OWNED BY public.channel_funding.id;


--
-- Name: channel_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_id_seq OWNED BY public.channel.id;


--
-- Name: channel_image; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_image (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    url public.varchar_url NOT NULL,
    image_width_size integer,
    is_resized boolean DEFAULT false
);


--
-- Name: channel_image_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_image_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_image_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_image_id_seq OWNED BY public.channel_image.id;


--
-- Name: channel_internal_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_internal_settings (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    embed_approved_media_url_paths text
);


--
-- Name: channel_internal_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_internal_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_internal_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_internal_settings_id_seq OWNED BY public.channel_internal_settings.id;


--
-- Name: channel_itunes_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_itunes_type (
    id integer NOT NULL,
    itunes_type text,
    CONSTRAINT channel_itunes_type_itunes_type_check CHECK ((itunes_type = ANY (ARRAY['episodic'::text, 'serial'::text])))
);


--
-- Name: channel_itunes_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_itunes_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_itunes_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_itunes_type_id_seq OWNED BY public.channel_itunes_type.id;


--
-- Name: channel_license; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_license (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    identifier public.varchar_normal NOT NULL,
    url public.varchar_url
);


--
-- Name: channel_license_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_license_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_license_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_license_id_seq OWNED BY public.channel_license.id;


--
-- Name: channel_location; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_location (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    geo public.varchar_normal,
    osm public.varchar_normal,
    name public.varchar_normal,
    CONSTRAINT channel_location_check CHECK (((geo IS NOT NULL) OR (osm IS NOT NULL)))
);


--
-- Name: channel_location_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_location_id_seq OWNED BY public.channel_location.id;


--
-- Name: channel_meta_boost; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_meta_boost (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    standard public.varchar_short NOT NULL,
    node public.varchar_url NOT NULL
);


--
-- Name: channel_meta_boost_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_meta_boost_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_meta_boost_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_meta_boost_id_seq OWNED BY public.channel_meta_boost.id;


--
-- Name: channel_person; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_person (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    name public.varchar_normal NOT NULL,
    role public.varchar_normal,
    person_group public.varchar_normal DEFAULT 'cast'::character varying,
    img public.varchar_url,
    href public.varchar_url
);


--
-- Name: channel_person_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_person_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_person_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_person_id_seq OWNED BY public.channel_person.id;


--
-- Name: channel_podroll; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_podroll (
    id integer NOT NULL,
    channel_id integer NOT NULL
);


--
-- Name: channel_podroll_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_podroll_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_podroll_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_podroll_id_seq OWNED BY public.channel_podroll.id;


--
-- Name: channel_podroll_remote_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_podroll_remote_item (
    id integer NOT NULL,
    channel_podroll_id integer NOT NULL,
    feed_guid uuid NOT NULL,
    feed_url public.varchar_url,
    item_guid public.varchar_uri,
    title public.varchar_normal,
    medium_id integer
);


--
-- Name: channel_podroll_remote_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_podroll_remote_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_podroll_remote_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_podroll_remote_item_id_seq OWNED BY public.channel_podroll_remote_item.id;


--
-- Name: channel_publisher; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_publisher (
    id integer NOT NULL,
    channel_id integer NOT NULL
);


--
-- Name: channel_publisher_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_publisher_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_publisher_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_publisher_id_seq OWNED BY public.channel_publisher.id;


--
-- Name: channel_publisher_remote_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_publisher_remote_item (
    id integer NOT NULL,
    channel_publisher_id integer NOT NULL,
    feed_guid uuid NOT NULL,
    feed_url public.varchar_url,
    item_guid public.varchar_uri,
    title public.varchar_normal,
    medium_id integer
);


--
-- Name: channel_publisher_remote_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_publisher_remote_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_publisher_remote_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_publisher_remote_item_id_seq OWNED BY public.channel_publisher_remote_item.id;


--
-- Name: channel_remote_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_remote_item (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    feed_guid uuid NOT NULL,
    feed_url public.varchar_url,
    item_guid public.varchar_uri,
    title public.varchar_normal,
    medium_id integer
);


--
-- Name: channel_remote_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_remote_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_remote_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_remote_item_id_seq OWNED BY public.channel_remote_item.id;


--
-- Name: channel_season; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_season (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    number integer NOT NULL,
    name public.varchar_normal
);


--
-- Name: channel_season_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_season_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_season_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_season_id_seq OWNED BY public.channel_season.id;


--
-- Name: channel_social_interact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_social_interact (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    protocol public.varchar_short NOT NULL,
    uri public.varchar_uri NOT NULL,
    account_id public.varchar_normal,
    account_url public.varchar_url,
    priority integer
);


--
-- Name: channel_social_interact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_social_interact_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_social_interact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_social_interact_id_seq OWNED BY public.channel_social_interact.id;


--
-- Name: channel_trailer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_trailer (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    url public.varchar_url NOT NULL,
    title public.varchar_normal,
    pub_date timestamp with time zone NOT NULL,
    length bigint,
    type public.varchar_short,
    channel_season_id integer
);


--
-- Name: channel_trailer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_trailer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_trailer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_trailer_id_seq OWNED BY public.channel_trailer.id;


--
-- Name: channel_txt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_txt (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    purpose public.varchar_normal,
    value public.varchar_long NOT NULL
);


--
-- Name: channel_txt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_txt_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_txt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_txt_id_seq OWNED BY public.channel_txt.id;


--
-- Name: channel_value; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_value (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    type public.varchar_short NOT NULL,
    method public.varchar_short NOT NULL,
    suggested double precision
);


--
-- Name: channel_value_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_value_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_value_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_value_id_seq OWNED BY public.channel_value.id;


--
-- Name: channel_value_recipient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_value_recipient (
    id integer NOT NULL,
    channel_value_id integer NOT NULL,
    type public.varchar_short NOT NULL,
    address public.varchar_long NOT NULL,
    split double precision NOT NULL,
    name public.varchar_normal,
    custom_key public.varchar_long,
    custom_value public.varchar_long,
    fee boolean DEFAULT false
);


--
-- Name: channel_value_recipient_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_value_recipient_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_value_recipient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_value_recipient_id_seq OWNED BY public.channel_value_recipient.id;


--
-- Name: clip; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clip (
    id integer NOT NULL,
    id_text public.nano_id_v2 NOT NULL,
    account_id integer NOT NULL,
    item_id integer NOT NULL,
    start_time public.media_player_time NOT NULL,
    end_time public.media_player_time,
    title public.varchar_normal,
    description public.varchar_long,
    sharable_status_id integer NOT NULL,
    created_at public.server_time_with_default
);


--
-- Name: clip_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clip_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clip_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clip_id_seq OWNED BY public.clip.id;


--
-- Name: feed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feed (
    id integer NOT NULL,
    url public.varchar_url NOT NULL,
    podcast_index_id integer NOT NULL,
    feed_flag_status_id integer NOT NULL,
    last_parsed_file_hash public.varchar_md5,
    is_parsing public.server_time,
    parsing_priority integer DEFAULT 0,
    container_id character varying(12),
    created_at public.server_time_with_default,
    updated_at public.server_time_with_default,
    feed_flag_status_reason_id integer,
    feed_flag_status_reason_note text,
    CONSTRAINT feed_parsing_priority_check CHECK (((parsing_priority >= 0) AND (parsing_priority <= 5)))
);


--
-- Name: feed_flag_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feed_flag_status (
    id integer NOT NULL,
    status text,
    created_at public.server_time_with_default,
    updated_at public.server_time_with_default,
    CONSTRAINT feed_flag_status_status_check CHECK ((status = ANY (ARRAY['active'::text, 'always-parse'::text, 'spam'::text, 'pending-archive'::text, 'archived'::text, 'takedown'::text])))
);


--
-- Name: feed_flag_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feed_flag_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feed_flag_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feed_flag_status_id_seq OWNED BY public.feed_flag_status.id;


--
-- Name: feed_flag_status_reason; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feed_flag_status_reason (
    id integer NOT NULL,
    reason text NOT NULL,
    created_at public.server_time_with_default,
    updated_at public.server_time_with_default
);


--
-- Name: feed_flag_status_reason_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feed_flag_status_reason_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feed_flag_status_reason_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feed_flag_status_reason_id_seq OWNED BY public.feed_flag_status_reason.id;


--
-- Name: feed_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feed_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feed_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feed_id_seq OWNED BY public.feed.id;


--
-- Name: feed_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feed_log (
    id integer NOT NULL,
    feed_id integer NOT NULL,
    last_http_status integer,
    last_good_http_status_time public.server_time,
    last_finished_parse_time public.server_time,
    parse_errors integer DEFAULT 0
);


--
-- Name: feed_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feed_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feed_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feed_log_id_seq OWNED BY public.feed_log.id;


--
-- Name: image_shrink_source; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.image_shrink_source (
    id integer NOT NULL,
    url public.varchar_url NOT NULL,
    etag public.varchar_normal,
    last_modified public.varchar_normal,
    content_length integer,
    checksum_sha256 public.varchar_normal,
    last_checked_at public.server_time,
    last_changed_at public.server_time,
    created_at public.server_time_with_default NOT NULL,
    updated_at public.server_time_with_default NOT NULL
);


--
-- Name: image_shrink_source_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.image_shrink_source_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: image_shrink_source_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.image_shrink_source_id_seq OWNED BY public.image_shrink_source.id;


--
-- Name: item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item (
    id integer NOT NULL,
    id_text public.nano_id_v2 NOT NULL,
    slug public.varchar_slug,
    channel_id integer NOT NULL,
    guid public.varchar_uri,
    guid_enclosure_url public.varchar_url,
    pub_date timestamp with time zone,
    title public.varchar_normal,
    item_flag_status_id integer NOT NULL,
    CONSTRAINT item_check CHECK (((guid IS NOT NULL) OR (guid_enclosure_url IS NOT NULL)))
);


--
-- Name: item_about; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_about (
    id integer NOT NULL,
    item_id integer NOT NULL,
    duration public.media_player_time,
    explicit boolean,
    website_link_url public.varchar_url,
    item_itunes_episode_type_id integer
);


--
-- Name: item_about_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_about_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_about_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_about_id_seq OWNED BY public.item_about.id;


--
-- Name: item_chapter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_chapter (
    id integer NOT NULL,
    id_text public.nano_id_v2 NOT NULL,
    item_chapters_object_id integer NOT NULL,
    data_hash public.varchar_md5 NOT NULL,
    start_time public.media_player_time NOT NULL,
    end_time public.media_player_time,
    title public.varchar_normal,
    img public.varchar_url,
    web_url public.varchar_url,
    table_of_contents boolean DEFAULT true
);


--
-- Name: item_chapter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_chapter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_chapter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_chapter_id_seq OWNED BY public.item_chapter.id;


--
-- Name: item_chapter_location; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_chapter_location (
    id integer NOT NULL,
    item_chapter_id integer NOT NULL,
    geo public.varchar_normal,
    osm public.varchar_normal,
    name public.varchar_normal,
    CONSTRAINT item_chapter_location_check CHECK (((geo IS NOT NULL) OR (osm IS NOT NULL)))
);


--
-- Name: item_chapter_location_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_chapter_location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_chapter_location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_chapter_location_id_seq OWNED BY public.item_chapter_location.id;


--
-- Name: item_chapters_feed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_chapters_feed (
    id integer NOT NULL,
    item_id integer NOT NULL,
    url public.varchar_url NOT NULL,
    type public.varchar_short NOT NULL
);


--
-- Name: item_chapters_feed_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_chapters_feed_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_chapters_feed_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_chapters_feed_id_seq OWNED BY public.item_chapters_feed.id;


--
-- Name: item_chapters_feed_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_chapters_feed_log (
    id integer NOT NULL,
    item_chapters_feed_id integer NOT NULL,
    last_http_status integer,
    last_good_http_status_time public.server_time,
    last_finished_parse_time public.server_time,
    parse_errors integer DEFAULT 0
);


--
-- Name: item_chapters_feed_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_chapters_feed_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_chapters_feed_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_chapters_feed_log_id_seq OWNED BY public.item_chapters_feed_log.id;


--
-- Name: item_chapters_object; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_chapters_object (
    id integer NOT NULL,
    item_chapters_feed_id integer NOT NULL,
    version public.varchar_short,
    author public.varchar_normal,
    title public.varchar_normal,
    podcast_name public.varchar_normal,
    description public.varchar_longer,
    file_name public.varchar_normal,
    waypoints boolean
);


--
-- Name: item_chapters_object_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_chapters_object_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_chapters_object_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_chapters_object_id_seq OWNED BY public.item_chapters_object.id;


--
-- Name: item_chat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_chat (
    id integer NOT NULL,
    item_id integer NOT NULL,
    server public.varchar_fqdn NOT NULL,
    protocol public.varchar_short NOT NULL,
    account_id public.varchar_normal,
    space public.varchar_normal
);


--
-- Name: item_chat_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_chat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_chat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_chat_id_seq OWNED BY public.item_chat.id;


--
-- Name: item_content_link; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_content_link (
    id integer NOT NULL,
    item_id integer NOT NULL,
    href public.varchar_url NOT NULL,
    title public.varchar_normal
);


--
-- Name: item_content_link_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_content_link_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_content_link_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_content_link_id_seq OWNED BY public.item_content_link.id;


--
-- Name: item_description; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_description (
    id integer NOT NULL,
    item_id integer NOT NULL,
    value public.varchar_longer NOT NULL
);


--
-- Name: item_description_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_description_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_description_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_description_id_seq OWNED BY public.item_description.id;


--
-- Name: item_enclosure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_enclosure (
    id integer NOT NULL,
    item_id integer NOT NULL,
    type public.varchar_short NOT NULL,
    length bigint,
    bitrate integer,
    height integer,
    language public.varchar_short,
    title public.varchar_short,
    rel public.varchar_short,
    codecs public.varchar_short,
    item_enclosure_default boolean DEFAULT false
);


--
-- Name: item_enclosure_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_enclosure_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_enclosure_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_enclosure_id_seq OWNED BY public.item_enclosure.id;


--
-- Name: item_enclosure_integrity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_enclosure_integrity (
    id integer NOT NULL,
    item_enclosure_id integer NOT NULL,
    type text NOT NULL,
    value public.varchar_long NOT NULL,
    CONSTRAINT item_enclosure_integrity_type_check CHECK ((type = ANY (ARRAY['sri'::text, 'pgp-signature'::text])))
);


--
-- Name: item_enclosure_integrity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_enclosure_integrity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_enclosure_integrity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_enclosure_integrity_id_seq OWNED BY public.item_enclosure_integrity.id;


--
-- Name: item_enclosure_source; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_enclosure_source (
    id integer NOT NULL,
    item_enclosure_id integer NOT NULL,
    uri public.varchar_uri NOT NULL,
    content_type public.varchar_short
);


--
-- Name: item_enclosure_source_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_enclosure_source_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_enclosure_source_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_enclosure_source_id_seq OWNED BY public.item_enclosure_source.id;


--
-- Name: item_flag_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_flag_status (
    id integer NOT NULL,
    status text,
    created_at public.server_time_with_default,
    updated_at public.server_time_with_default,
    CONSTRAINT item_flag_status_status_check CHECK ((status = ANY (ARRAY['active'::text, 'pending-archive'::text, 'archived'::text, 'pending-delete'::text])))
);


--
-- Name: item_flag_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_flag_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_flag_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_flag_status_id_seq OWNED BY public.item_flag_status.id;


--
-- Name: item_funding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_funding (
    id integer NOT NULL,
    item_id integer NOT NULL,
    url public.varchar_url NOT NULL,
    title public.varchar_normal
);


--
-- Name: item_funding_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_funding_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_funding_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_funding_id_seq OWNED BY public.item_funding.id;


--
-- Name: item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_id_seq OWNED BY public.item.id;


--
-- Name: item_image; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_image (
    id integer NOT NULL,
    item_id integer NOT NULL,
    url public.varchar_url NOT NULL,
    image_width_size integer,
    is_resized boolean DEFAULT false
);


--
-- Name: item_image_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_image_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_image_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_image_id_seq OWNED BY public.item_image.id;


--
-- Name: item_itunes_episode_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_itunes_episode_type (
    id integer NOT NULL,
    itunes_episode_type text,
    CONSTRAINT item_itunes_episode_type_itunes_episode_type_check CHECK ((itunes_episode_type = ANY (ARRAY['full'::text, 'trailer'::text, 'bonus'::text])))
);


--
-- Name: item_itunes_episode_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_itunes_episode_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_itunes_episode_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_itunes_episode_type_id_seq OWNED BY public.item_itunes_episode_type.id;


--
-- Name: item_license; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_license (
    id integer NOT NULL,
    item_id integer NOT NULL,
    identifier public.varchar_normal NOT NULL,
    url public.varchar_url
);


--
-- Name: item_license_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_license_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_license_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_license_id_seq OWNED BY public.item_license.id;


--
-- Name: item_location; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_location (
    id integer NOT NULL,
    item_id integer NOT NULL,
    geo public.varchar_normal,
    osm public.varchar_normal,
    name public.varchar_normal,
    CONSTRAINT item_location_check CHECK (((geo IS NOT NULL) OR (osm IS NOT NULL)))
);


--
-- Name: item_location_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_location_id_seq OWNED BY public.item_location.id;


--
-- Name: item_person; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_person (
    id integer NOT NULL,
    item_id integer NOT NULL,
    name public.varchar_normal NOT NULL,
    role public.varchar_normal,
    person_group public.varchar_normal DEFAULT 'cast'::character varying,
    img public.varchar_url,
    href public.varchar_url
);


--
-- Name: item_person_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_person_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_person_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_person_id_seq OWNED BY public.item_person.id;


--
-- Name: item_season; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_season (
    id integer NOT NULL,
    channel_season_id integer NOT NULL,
    item_id integer NOT NULL,
    title public.varchar_normal
);


--
-- Name: item_season_episode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_season_episode (
    id integer NOT NULL,
    item_id integer NOT NULL,
    display public.varchar_short,
    number double precision NOT NULL
);


--
-- Name: item_season_episode_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_season_episode_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_season_episode_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_season_episode_id_seq OWNED BY public.item_season_episode.id;


--
-- Name: item_season_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_season_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_season_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_season_id_seq OWNED BY public.item_season.id;


--
-- Name: item_social_interact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_social_interact (
    id integer NOT NULL,
    item_id integer NOT NULL,
    protocol public.varchar_short NOT NULL,
    uri public.varchar_uri NOT NULL,
    account_id public.varchar_normal,
    account_url public.varchar_url,
    priority integer
);


--
-- Name: item_social_interact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_social_interact_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_social_interact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_social_interact_id_seq OWNED BY public.item_social_interact.id;


--
-- Name: item_soundbite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_soundbite (
    id integer NOT NULL,
    id_text public.nano_id_v2 NOT NULL,
    item_id integer NOT NULL,
    start_time public.media_player_time NOT NULL,
    duration public.media_player_time NOT NULL,
    title public.varchar_normal
);


--
-- Name: item_soundbite_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_soundbite_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_soundbite_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_soundbite_id_seq OWNED BY public.item_soundbite.id;


--
-- Name: item_transcript; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_transcript (
    id integer NOT NULL,
    item_id integer NOT NULL,
    url public.varchar_url NOT NULL,
    type public.varchar_short NOT NULL,
    language public.varchar_short,
    rel character varying(50),
    CONSTRAINT item_transcript_rel_check CHECK (((rel IS NULL) OR ((rel)::text = 'captions'::text)))
);


--
-- Name: item_transcript_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_transcript_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_transcript_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_transcript_id_seq OWNED BY public.item_transcript.id;


--
-- Name: item_txt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_txt (
    id integer NOT NULL,
    item_id integer NOT NULL,
    purpose public.varchar_normal,
    value public.varchar_long NOT NULL
);


--
-- Name: item_txt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_txt_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_txt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_txt_id_seq OWNED BY public.item_txt.id;


--
-- Name: item_value; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_value (
    id integer NOT NULL,
    item_id integer NOT NULL,
    type public.varchar_short NOT NULL,
    method public.varchar_short NOT NULL,
    suggested double precision
);


--
-- Name: item_value_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_value_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_value_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_value_id_seq OWNED BY public.item_value.id;


--
-- Name: item_value_recipient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_value_recipient (
    id integer NOT NULL,
    item_value_id integer NOT NULL,
    type public.varchar_short NOT NULL,
    address public.varchar_long NOT NULL,
    split double precision NOT NULL,
    name public.varchar_normal,
    custom_key public.varchar_long,
    custom_value public.varchar_long,
    fee boolean DEFAULT false
);


--
-- Name: item_value_recipient_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_value_recipient_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_value_recipient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_value_recipient_id_seq OWNED BY public.item_value_recipient.id;


--
-- Name: item_value_time_split; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_value_time_split (
    id integer NOT NULL,
    item_value_id integer NOT NULL,
    start_time public.media_player_time NOT NULL,
    duration public.media_player_time NOT NULL,
    remote_start_time public.media_player_time DEFAULT 0,
    remote_percentage public.media_player_time DEFAULT 100
);


--
-- Name: item_value_time_split_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_value_time_split_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_value_time_split_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_value_time_split_id_seq OWNED BY public.item_value_time_split.id;


--
-- Name: item_value_time_split_recipient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_value_time_split_recipient (
    id integer NOT NULL,
    item_value_time_split_id integer CONSTRAINT item_value_time_split_recipie_item_value_time_split_id_not_null NOT NULL,
    type public.varchar_short NOT NULL,
    address public.varchar_long NOT NULL,
    split double precision NOT NULL,
    name public.varchar_normal,
    custom_key public.varchar_long,
    custom_value public.varchar_long,
    fee boolean DEFAULT false
);


--
-- Name: item_value_time_split_recipient_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_value_time_split_recipient_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_value_time_split_recipient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_value_time_split_recipient_id_seq OWNED BY public.item_value_time_split_recipient.id;


--
-- Name: item_value_time_split_remote_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_value_time_split_remote_item (
    id integer NOT NULL,
    item_value_time_split_id integer CONSTRAINT item_value_time_split_remote__item_value_time_split_id_not_null NOT NULL,
    feed_guid uuid NOT NULL,
    feed_url public.varchar_url,
    item_guid public.varchar_uri,
    title public.varchar_normal
);


--
-- Name: item_value_time_split_remote_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_value_time_split_remote_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_value_time_split_remote_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_value_time_split_remote_item_id_seq OWNED BY public.item_value_time_split_remote_item.id;


--
-- Name: linear_migration_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.linear_migration_history (
    id integer NOT NULL,
    migration_filename character varying(255) NOT NULL,
    migration_checksum character varying(64) NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: linear_migration_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.linear_migration_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: linear_migration_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.linear_migration_history_id_seq OWNED BY public.linear_migration_history.id;


--
-- Name: live_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_item (
    id integer NOT NULL,
    item_id integer NOT NULL,
    live_item_status_id integer NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    chat_web_url public.varchar_url
);


--
-- Name: live_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.live_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: live_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.live_item_id_seq OWNED BY public.live_item.id;


--
-- Name: live_item_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_item_status (
    id integer NOT NULL,
    status text,
    CONSTRAINT live_item_status_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'live'::text, 'ended'::text])))
);


--
-- Name: live_item_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.live_item_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: live_item_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.live_item_status_id_seq OWNED BY public.live_item_status.id;


--
-- Name: medium; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medium (
    id integer NOT NULL,
    value text,
    CONSTRAINT medium_value_check CHECK ((value = ANY (ARRAY['publisher'::text, 'podcast'::text, 'music'::text, 'video'::text, 'film'::text, 'audiobook'::text, 'newsletter'::text, 'blog'::text, 'course'::text, 'mixed'::text, 'podcastL'::text, 'musicL'::text, 'videoL'::text, 'filmL'::text, 'audiobookL'::text, 'newsletterL'::text, 'blogL'::text, 'publisherL'::text, 'courseL'::text, 'av'::text, 'publisher-podcast'::text, 'publisher-music'::text, 'publisher-video'::text, 'publisher-film'::text, 'publisher-audiobook'::text, 'publisher-newsletter'::text, 'publisher-blog'::text, 'publisher-course'::text, 'publisher-av'::text])))
);


--
-- Name: medium_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medium_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medium_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medium_id_seq OWNED BY public.medium.id;


--
-- Name: membership_claim_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.membership_claim_token (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    claimed boolean DEFAULT false,
    months_to_add integer DEFAULT 1,
    account_membership_id integer
);


--
-- Name: on_demand_parser_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.on_demand_parser_event (
    id integer NOT NULL,
    account_id integer NOT NULL,
    podcast_index_id integer NOT NULL,
    remote_parent_podcast_index_id integer,
    type public.on_demand_parser_event_type NOT NULL,
    created_at public.server_time_with_default NOT NULL
);


--
-- Name: on_demand_parser_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.on_demand_parser_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: on_demand_parser_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.on_demand_parser_event_id_seq OWNED BY public.on_demand_parser_event.id;


--
-- Name: playlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playlist (
    id integer NOT NULL,
    id_text public.nano_id_v2 NOT NULL,
    account_id integer NOT NULL,
    sharable_status_id integer NOT NULL,
    title public.varchar_normal,
    description public.varchar_long,
    is_default_likes boolean DEFAULT false,
    item_count integer DEFAULT 0,
    medium_id integer NOT NULL,
    last_updated public.server_time_with_default NOT NULL
);


--
-- Name: playlist_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.playlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: playlist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.playlist_id_seq OWNED BY public.playlist.id;


--
-- Name: playlist_resource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playlist_resource (
    id integer NOT NULL,
    playlist_id integer NOT NULL,
    list_position public.list_position NOT NULL,
    item_id integer,
    clip_id integer,
    item_soundbite_id integer,
    add_by_rss_resource_data jsonb,
    add_by_rss_hash_id public.varchar_md5,
    CONSTRAINT playlist_resource_check CHECK (((((((item_id IS NOT NULL))::integer + ((add_by_rss_hash_id IS NOT NULL))::integer) + ((clip_id IS NOT NULL))::integer) + ((item_soundbite_id IS NOT NULL))::integer) = 1))
);


--
-- Name: playlist_resource_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.playlist_resource_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: playlist_resource_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.playlist_resource_id_seq OWNED BY public.playlist_resource.id;


--
-- Name: queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.queue (
    id integer NOT NULL,
    id_text public.nano_id_v2 NOT NULL,
    account_id integer NOT NULL,
    medium_id integer NOT NULL,
    is_active_queue boolean DEFAULT false NOT NULL
);


--
-- Name: queue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.queue_id_seq OWNED BY public.queue.id;


--
-- Name: queue_resource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.queue_resource (
    id integer NOT NULL,
    queue_id integer NOT NULL,
    list_position public.list_position NOT NULL,
    playback_position public.media_player_time DEFAULT 0 NOT NULL,
    media_file_duration public.media_player_time DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    item_id integer,
    clip_id integer,
    item_soundbite_id integer,
    add_by_rss_resource_data jsonb,
    add_by_rss_hash_id public.varchar_md5,
    CONSTRAINT queue_resource_check CHECK (((((((item_id IS NOT NULL))::integer + ((add_by_rss_hash_id IS NOT NULL))::integer) + ((clip_id IS NOT NULL))::integer) + ((item_soundbite_id IS NOT NULL))::integer) = 1))
);


--
-- Name: queue_resource_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.queue_resource_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: queue_resource_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.queue_resource_id_seq OWNED BY public.queue_resource.id;


--
-- Name: sharable_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sharable_status (
    id integer NOT NULL,
    status text,
    CONSTRAINT sharable_status_status_check CHECK ((status = ANY (ARRAY['public'::text, 'unlisted'::text, 'private'::text])))
);


--
-- Name: sharable_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sharable_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sharable_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sharable_status_id_seq OWNED BY public.sharable_status.id;


--
-- Name: stats_aggregated_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_aggregated_account (
    id integer NOT NULL,
    tracked_account_id integer NOT NULL,
    day_current_count integer DEFAULT 0 NOT NULL,
    day_1_count integer DEFAULT 0 NOT NULL,
    day_2_count integer DEFAULT 0 NOT NULL,
    day_3_count integer DEFAULT 0 NOT NULL,
    day_4_count integer DEFAULT 0 NOT NULL,
    day_5_count integer DEFAULT 0 NOT NULL,
    day_6_count integer DEFAULT 0 NOT NULL,
    day_7_count integer DEFAULT 0 NOT NULL,
    day_8_count integer DEFAULT 0 NOT NULL,
    week_current_count integer DEFAULT 0 NOT NULL,
    week_1_count integer DEFAULT 0 NOT NULL,
    week_2_count integer DEFAULT 0 NOT NULL,
    week_3_count integer DEFAULT 0 NOT NULL,
    week_4_count integer DEFAULT 0 NOT NULL,
    month_current_count integer DEFAULT 0 NOT NULL,
    month_1_count integer DEFAULT 0 NOT NULL,
    all_time_count integer DEFAULT 0 NOT NULL
);


--
-- Name: stats_aggregated_account_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stats_aggregated_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stats_aggregated_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stats_aggregated_account_id_seq OWNED BY public.stats_aggregated_account.id;


--
-- Name: stats_aggregated_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_aggregated_channel (
    id integer NOT NULL,
    channel_id integer NOT NULL,
    day_current_count integer DEFAULT 0 NOT NULL,
    day_1_count integer DEFAULT 0 NOT NULL,
    day_2_count integer DEFAULT 0 NOT NULL,
    day_3_count integer DEFAULT 0 NOT NULL,
    day_4_count integer DEFAULT 0 NOT NULL,
    day_5_count integer DEFAULT 0 NOT NULL,
    day_6_count integer DEFAULT 0 NOT NULL,
    day_7_count integer DEFAULT 0 NOT NULL,
    day_8_count integer DEFAULT 0 NOT NULL,
    week_current_count integer DEFAULT 0 NOT NULL,
    week_1_count integer DEFAULT 0 NOT NULL,
    week_2_count integer DEFAULT 0 NOT NULL,
    week_3_count integer DEFAULT 0 NOT NULL,
    week_4_count integer DEFAULT 0 NOT NULL,
    month_current_count integer DEFAULT 0 NOT NULL,
    month_1_count integer DEFAULT 0 NOT NULL,
    all_time_count integer DEFAULT 0 NOT NULL
);


--
-- Name: stats_aggregated_channel_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stats_aggregated_channel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stats_aggregated_channel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stats_aggregated_channel_id_seq OWNED BY public.stats_aggregated_channel.id;


--
-- Name: stats_aggregated_clip; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_aggregated_clip (
    id integer NOT NULL,
    clip_id integer NOT NULL,
    day_current_count integer DEFAULT 0 NOT NULL,
    day_1_count integer DEFAULT 0 NOT NULL,
    day_2_count integer DEFAULT 0 NOT NULL,
    day_3_count integer DEFAULT 0 NOT NULL,
    day_4_count integer DEFAULT 0 NOT NULL,
    day_5_count integer DEFAULT 0 NOT NULL,
    day_6_count integer DEFAULT 0 NOT NULL,
    day_7_count integer DEFAULT 0 NOT NULL,
    day_8_count integer DEFAULT 0 NOT NULL,
    week_current_count integer DEFAULT 0 NOT NULL,
    week_1_count integer DEFAULT 0 NOT NULL,
    week_2_count integer DEFAULT 0 NOT NULL,
    week_3_count integer DEFAULT 0 NOT NULL,
    week_4_count integer DEFAULT 0 NOT NULL,
    month_current_count integer DEFAULT 0 NOT NULL,
    month_1_count integer DEFAULT 0 NOT NULL,
    all_time_count integer DEFAULT 0 NOT NULL
);


--
-- Name: stats_aggregated_clip_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stats_aggregated_clip_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stats_aggregated_clip_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stats_aggregated_clip_id_seq OWNED BY public.stats_aggregated_clip.id;


--
-- Name: stats_aggregated_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_aggregated_item (
    id integer NOT NULL,
    item_id integer NOT NULL,
    day_current_count integer DEFAULT 0 NOT NULL,
    day_1_count integer DEFAULT 0 NOT NULL,
    day_2_count integer DEFAULT 0 NOT NULL,
    day_3_count integer DEFAULT 0 NOT NULL,
    day_4_count integer DEFAULT 0 NOT NULL,
    day_5_count integer DEFAULT 0 NOT NULL,
    day_6_count integer DEFAULT 0 NOT NULL,
    day_7_count integer DEFAULT 0 NOT NULL,
    day_8_count integer DEFAULT 0 NOT NULL,
    week_current_count integer DEFAULT 0 NOT NULL,
    week_1_count integer DEFAULT 0 NOT NULL,
    week_2_count integer DEFAULT 0 NOT NULL,
    week_3_count integer DEFAULT 0 NOT NULL,
    week_4_count integer DEFAULT 0 NOT NULL,
    month_current_count integer DEFAULT 0 NOT NULL,
    month_1_count integer DEFAULT 0 NOT NULL,
    all_time_count integer DEFAULT 0 NOT NULL
);


--
-- Name: stats_aggregated_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stats_aggregated_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stats_aggregated_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stats_aggregated_item_id_seq OWNED BY public.stats_aggregated_item.id;


--
-- Name: stats_aggregated_playlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_aggregated_playlist (
    id integer NOT NULL,
    playlist_id integer NOT NULL,
    day_current_count integer DEFAULT 0 NOT NULL,
    day_1_count integer DEFAULT 0 NOT NULL,
    day_2_count integer DEFAULT 0 NOT NULL,
    day_3_count integer DEFAULT 0 NOT NULL,
    day_4_count integer DEFAULT 0 NOT NULL,
    day_5_count integer DEFAULT 0 NOT NULL,
    day_6_count integer DEFAULT 0 NOT NULL,
    day_7_count integer DEFAULT 0 NOT NULL,
    day_8_count integer DEFAULT 0 NOT NULL,
    week_current_count integer DEFAULT 0 NOT NULL,
    week_1_count integer DEFAULT 0 NOT NULL,
    week_2_count integer DEFAULT 0 NOT NULL,
    week_3_count integer DEFAULT 0 NOT NULL,
    week_4_count integer DEFAULT 0 NOT NULL,
    month_current_count integer DEFAULT 0 NOT NULL,
    month_1_count integer DEFAULT 0 NOT NULL,
    all_time_count integer DEFAULT 0 NOT NULL
);


--
-- Name: stats_aggregated_playlist_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stats_aggregated_playlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stats_aggregated_playlist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stats_aggregated_playlist_id_seq OWNED BY public.stats_aggregated_playlist.id;


--
-- Name: stats_track_account_guid; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_track_account_guid (
    id integer NOT NULL,
    account_id integer NOT NULL,
    account_guid uuid NOT NULL,
    updated_at public.server_time_with_default NOT NULL
);


--
-- Name: stats_track_account_guid_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stats_track_account_guid_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stats_track_account_guid_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stats_track_account_guid_id_seq OWNED BY public.stats_track_account_guid.id;


--
-- Name: stats_track_event_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_track_event_account (
    id integer NOT NULL,
    account_guid uuid NOT NULL,
    tracked_account_id integer NOT NULL,
    created_at public.server_time_with_default NOT NULL
);


--
-- Name: stats_track_event_account_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stats_track_event_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stats_track_event_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stats_track_event_account_id_seq OWNED BY public.stats_track_event_account.id;


--
-- Name: stats_track_event_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_track_event_channel (
    id integer NOT NULL,
    account_guid uuid NOT NULL,
    channel_id integer NOT NULL,
    created_at public.server_time_with_default NOT NULL
);


--
-- Name: stats_track_event_channel_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stats_track_event_channel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stats_track_event_channel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stats_track_event_channel_id_seq OWNED BY public.stats_track_event_channel.id;


--
-- Name: stats_track_event_clip; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_track_event_clip (
    id integer NOT NULL,
    account_guid uuid NOT NULL,
    clip_id integer NOT NULL,
    created_at public.server_time_with_default NOT NULL
);


--
-- Name: stats_track_event_clip_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stats_track_event_clip_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stats_track_event_clip_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stats_track_event_clip_id_seq OWNED BY public.stats_track_event_clip.id;


--
-- Name: stats_track_event_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_track_event_item (
    id integer NOT NULL,
    account_guid uuid NOT NULL,
    item_id integer NOT NULL,
    created_at public.server_time_with_default NOT NULL
);


--
-- Name: stats_track_event_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stats_track_event_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stats_track_event_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stats_track_event_item_id_seq OWNED BY public.stats_track_event_item.id;


--
-- Name: stats_track_event_playlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_track_event_playlist (
    id integer NOT NULL,
    account_guid uuid NOT NULL,
    playlist_id integer NOT NULL,
    created_at public.server_time_with_default NOT NULL
);


--
-- Name: stats_track_event_playlist_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stats_track_event_playlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stats_track_event_playlist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stats_track_event_playlist_id_seq OWNED BY public.stats_track_event_playlist.id;


--
-- Name: account id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account ALTER COLUMN id SET DEFAULT nextval('public.account_id_seq'::regclass);


--
-- Name: account_credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_credentials ALTER COLUMN id SET DEFAULT nextval('public.account_credentials_id_seq'::regclass);


--
-- Name: account_email_change_verification id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_email_change_verification ALTER COLUMN id SET DEFAULT nextval('public.account_email_change_verification_id_seq'::regclass);


--
-- Name: account_fcm_device id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_fcm_device ALTER COLUMN id SET DEFAULT nextval('public.account_fcm_device_id_seq'::regclass);


--
-- Name: account_membership id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_membership ALTER COLUMN id SET DEFAULT nextval('public.account_membership_id_seq'::regclass);


--
-- Name: account_membership_status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_membership_status ALTER COLUMN id SET DEFAULT nextval('public.account_membership_status_id_seq'::regclass);


--
-- Name: account_notification_channel id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_notification_channel ALTER COLUMN id SET DEFAULT nextval('public.account_notification_channel_id_seq'::regclass);


--
-- Name: account_notification_channel_type id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_notification_channel_type ALTER COLUMN id SET DEFAULT nextval('public.account_notification_channel_type_id_seq'::regclass);


--
-- Name: account_profile id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_profile ALTER COLUMN id SET DEFAULT nextval('public.account_profile_id_seq'::regclass);


--
-- Name: account_reset_password id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_reset_password ALTER COLUMN id SET DEFAULT nextval('public.account_reset_password_id_seq'::regclass);


--
-- Name: account_set_password id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_set_password ALTER COLUMN id SET DEFAULT nextval('public.account_set_password_id_seq'::regclass);


--
-- Name: account_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings ALTER COLUMN id SET DEFAULT nextval('public.account_settings_id_seq'::regclass);


--
-- Name: account_settings_locale id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings_locale ALTER COLUMN id SET DEFAULT nextval('public.account_settings_locale_id_seq'::regclass);


--
-- Name: account_settings_notification id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings_notification ALTER COLUMN id SET DEFAULT nextval('public.account_settings_notification_id_seq'::regclass);


--
-- Name: account_settings_notification_type id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings_notification_type ALTER COLUMN id SET DEFAULT nextval('public.account_settings_notification_type_id_seq'::regclass);


--
-- Name: account_up_device id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_up_device ALTER COLUMN id SET DEFAULT nextval('public.account_up_device_id_seq'::regclass);


--
-- Name: account_verification id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_verification ALTER COLUMN id SET DEFAULT nextval('public.account_verification_id_seq'::regclass);


--
-- Name: account_webpush_device id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_webpush_device ALTER COLUMN id SET DEFAULT nextval('public.account_webpush_device_id_seq'::regclass);


--
-- Name: category id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category ALTER COLUMN id SET DEFAULT nextval('public.category_id_seq'::regclass);


--
-- Name: channel id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel ALTER COLUMN id SET DEFAULT nextval('public.channel_id_seq'::regclass);


--
-- Name: channel_about id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_about ALTER COLUMN id SET DEFAULT nextval('public.channel_about_id_seq'::regclass);


--
-- Name: channel_category id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_category ALTER COLUMN id SET DEFAULT nextval('public.channel_category_id_seq'::regclass);


--
-- Name: channel_chat id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_chat ALTER COLUMN id SET DEFAULT nextval('public.channel_chat_id_seq'::regclass);


--
-- Name: channel_description id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_description ALTER COLUMN id SET DEFAULT nextval('public.channel_description_id_seq'::regclass);


--
-- Name: channel_funding id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_funding ALTER COLUMN id SET DEFAULT nextval('public.channel_funding_id_seq'::regclass);


--
-- Name: channel_image id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_image ALTER COLUMN id SET DEFAULT nextval('public.channel_image_id_seq'::regclass);


--
-- Name: channel_internal_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_internal_settings ALTER COLUMN id SET DEFAULT nextval('public.channel_internal_settings_id_seq'::regclass);


--
-- Name: channel_itunes_type id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_itunes_type ALTER COLUMN id SET DEFAULT nextval('public.channel_itunes_type_id_seq'::regclass);


--
-- Name: channel_license id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_license ALTER COLUMN id SET DEFAULT nextval('public.channel_license_id_seq'::regclass);


--
-- Name: channel_location id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_location ALTER COLUMN id SET DEFAULT nextval('public.channel_location_id_seq'::regclass);


--
-- Name: channel_meta_boost id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_meta_boost ALTER COLUMN id SET DEFAULT nextval('public.channel_meta_boost_id_seq'::regclass);


--
-- Name: channel_person id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_person ALTER COLUMN id SET DEFAULT nextval('public.channel_person_id_seq'::regclass);


--
-- Name: channel_podroll id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_podroll ALTER COLUMN id SET DEFAULT nextval('public.channel_podroll_id_seq'::regclass);


--
-- Name: channel_podroll_remote_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_podroll_remote_item ALTER COLUMN id SET DEFAULT nextval('public.channel_podroll_remote_item_id_seq'::regclass);


--
-- Name: channel_publisher id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_publisher ALTER COLUMN id SET DEFAULT nextval('public.channel_publisher_id_seq'::regclass);


--
-- Name: channel_publisher_remote_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_publisher_remote_item ALTER COLUMN id SET DEFAULT nextval('public.channel_publisher_remote_item_id_seq'::regclass);


--
-- Name: channel_remote_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_remote_item ALTER COLUMN id SET DEFAULT nextval('public.channel_remote_item_id_seq'::regclass);


--
-- Name: channel_season id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_season ALTER COLUMN id SET DEFAULT nextval('public.channel_season_id_seq'::regclass);


--
-- Name: channel_social_interact id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_social_interact ALTER COLUMN id SET DEFAULT nextval('public.channel_social_interact_id_seq'::regclass);


--
-- Name: channel_trailer id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_trailer ALTER COLUMN id SET DEFAULT nextval('public.channel_trailer_id_seq'::regclass);


--
-- Name: channel_txt id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_txt ALTER COLUMN id SET DEFAULT nextval('public.channel_txt_id_seq'::regclass);


--
-- Name: channel_value id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_value ALTER COLUMN id SET DEFAULT nextval('public.channel_value_id_seq'::regclass);


--
-- Name: channel_value_recipient id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_value_recipient ALTER COLUMN id SET DEFAULT nextval('public.channel_value_recipient_id_seq'::regclass);


--
-- Name: clip id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clip ALTER COLUMN id SET DEFAULT nextval('public.clip_id_seq'::regclass);


--
-- Name: feed id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed ALTER COLUMN id SET DEFAULT nextval('public.feed_id_seq'::regclass);


--
-- Name: feed_flag_status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_flag_status ALTER COLUMN id SET DEFAULT nextval('public.feed_flag_status_id_seq'::regclass);


--
-- Name: feed_flag_status_reason id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_flag_status_reason ALTER COLUMN id SET DEFAULT nextval('public.feed_flag_status_reason_id_seq'::regclass);


--
-- Name: feed_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_log ALTER COLUMN id SET DEFAULT nextval('public.feed_log_id_seq'::regclass);


--
-- Name: image_shrink_source id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_shrink_source ALTER COLUMN id SET DEFAULT nextval('public.image_shrink_source_id_seq'::regclass);


--
-- Name: item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item ALTER COLUMN id SET DEFAULT nextval('public.item_id_seq'::regclass);


--
-- Name: item_about id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_about ALTER COLUMN id SET DEFAULT nextval('public.item_about_id_seq'::regclass);


--
-- Name: item_chapter id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapter ALTER COLUMN id SET DEFAULT nextval('public.item_chapter_id_seq'::regclass);


--
-- Name: item_chapter_location id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapter_location ALTER COLUMN id SET DEFAULT nextval('public.item_chapter_location_id_seq'::regclass);


--
-- Name: item_chapters_feed id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapters_feed ALTER COLUMN id SET DEFAULT nextval('public.item_chapters_feed_id_seq'::regclass);


--
-- Name: item_chapters_feed_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapters_feed_log ALTER COLUMN id SET DEFAULT nextval('public.item_chapters_feed_log_id_seq'::regclass);


--
-- Name: item_chapters_object id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapters_object ALTER COLUMN id SET DEFAULT nextval('public.item_chapters_object_id_seq'::regclass);


--
-- Name: item_chat id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chat ALTER COLUMN id SET DEFAULT nextval('public.item_chat_id_seq'::regclass);


--
-- Name: item_content_link id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_content_link ALTER COLUMN id SET DEFAULT nextval('public.item_content_link_id_seq'::regclass);


--
-- Name: item_description id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_description ALTER COLUMN id SET DEFAULT nextval('public.item_description_id_seq'::regclass);


--
-- Name: item_enclosure id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_enclosure ALTER COLUMN id SET DEFAULT nextval('public.item_enclosure_id_seq'::regclass);


--
-- Name: item_enclosure_integrity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_enclosure_integrity ALTER COLUMN id SET DEFAULT nextval('public.item_enclosure_integrity_id_seq'::regclass);


--
-- Name: item_enclosure_source id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_enclosure_source ALTER COLUMN id SET DEFAULT nextval('public.item_enclosure_source_id_seq'::regclass);


--
-- Name: item_flag_status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_flag_status ALTER COLUMN id SET DEFAULT nextval('public.item_flag_status_id_seq'::regclass);


--
-- Name: item_funding id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_funding ALTER COLUMN id SET DEFAULT nextval('public.item_funding_id_seq'::regclass);


--
-- Name: item_image id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_image ALTER COLUMN id SET DEFAULT nextval('public.item_image_id_seq'::regclass);


--
-- Name: item_itunes_episode_type id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_itunes_episode_type ALTER COLUMN id SET DEFAULT nextval('public.item_itunes_episode_type_id_seq'::regclass);


--
-- Name: item_license id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_license ALTER COLUMN id SET DEFAULT nextval('public.item_license_id_seq'::regclass);


--
-- Name: item_location id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_location ALTER COLUMN id SET DEFAULT nextval('public.item_location_id_seq'::regclass);


--
-- Name: item_person id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_person ALTER COLUMN id SET DEFAULT nextval('public.item_person_id_seq'::regclass);


--
-- Name: item_season id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_season ALTER COLUMN id SET DEFAULT nextval('public.item_season_id_seq'::regclass);


--
-- Name: item_season_episode id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_season_episode ALTER COLUMN id SET DEFAULT nextval('public.item_season_episode_id_seq'::regclass);


--
-- Name: item_social_interact id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_social_interact ALTER COLUMN id SET DEFAULT nextval('public.item_social_interact_id_seq'::regclass);


--
-- Name: item_soundbite id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_soundbite ALTER COLUMN id SET DEFAULT nextval('public.item_soundbite_id_seq'::regclass);


--
-- Name: item_transcript id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_transcript ALTER COLUMN id SET DEFAULT nextval('public.item_transcript_id_seq'::regclass);


--
-- Name: item_txt id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_txt ALTER COLUMN id SET DEFAULT nextval('public.item_txt_id_seq'::regclass);


--
-- Name: item_value id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value ALTER COLUMN id SET DEFAULT nextval('public.item_value_id_seq'::regclass);


--
-- Name: item_value_recipient id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value_recipient ALTER COLUMN id SET DEFAULT nextval('public.item_value_recipient_id_seq'::regclass);


--
-- Name: item_value_time_split id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value_time_split ALTER COLUMN id SET DEFAULT nextval('public.item_value_time_split_id_seq'::regclass);


--
-- Name: item_value_time_split_recipient id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value_time_split_recipient ALTER COLUMN id SET DEFAULT nextval('public.item_value_time_split_recipient_id_seq'::regclass);


--
-- Name: item_value_time_split_remote_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value_time_split_remote_item ALTER COLUMN id SET DEFAULT nextval('public.item_value_time_split_remote_item_id_seq'::regclass);


--
-- Name: linear_migration_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linear_migration_history ALTER COLUMN id SET DEFAULT nextval('public.linear_migration_history_id_seq'::regclass);


--
-- Name: live_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_item ALTER COLUMN id SET DEFAULT nextval('public.live_item_id_seq'::regclass);


--
-- Name: live_item_status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_item_status ALTER COLUMN id SET DEFAULT nextval('public.live_item_status_id_seq'::regclass);


--
-- Name: medium id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medium ALTER COLUMN id SET DEFAULT nextval('public.medium_id_seq'::regclass);


--
-- Name: on_demand_parser_event id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.on_demand_parser_event ALTER COLUMN id SET DEFAULT nextval('public.on_demand_parser_event_id_seq'::regclass);


--
-- Name: playlist id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist ALTER COLUMN id SET DEFAULT nextval('public.playlist_id_seq'::regclass);


--
-- Name: playlist_resource id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_resource ALTER COLUMN id SET DEFAULT nextval('public.playlist_resource_id_seq'::regclass);


--
-- Name: queue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue ALTER COLUMN id SET DEFAULT nextval('public.queue_id_seq'::regclass);


--
-- Name: queue_resource id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_resource ALTER COLUMN id SET DEFAULT nextval('public.queue_resource_id_seq'::regclass);


--
-- Name: sharable_status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sharable_status ALTER COLUMN id SET DEFAULT nextval('public.sharable_status_id_seq'::regclass);


--
-- Name: stats_aggregated_account id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_account ALTER COLUMN id SET DEFAULT nextval('public.stats_aggregated_account_id_seq'::regclass);


--
-- Name: stats_aggregated_channel id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_channel ALTER COLUMN id SET DEFAULT nextval('public.stats_aggregated_channel_id_seq'::regclass);


--
-- Name: stats_aggregated_clip id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_clip ALTER COLUMN id SET DEFAULT nextval('public.stats_aggregated_clip_id_seq'::regclass);


--
-- Name: stats_aggregated_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_item ALTER COLUMN id SET DEFAULT nextval('public.stats_aggregated_item_id_seq'::regclass);


--
-- Name: stats_aggregated_playlist id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_playlist ALTER COLUMN id SET DEFAULT nextval('public.stats_aggregated_playlist_id_seq'::regclass);


--
-- Name: stats_track_account_guid id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_account_guid ALTER COLUMN id SET DEFAULT nextval('public.stats_track_account_guid_id_seq'::regclass);


--
-- Name: stats_track_event_account id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_account ALTER COLUMN id SET DEFAULT nextval('public.stats_track_event_account_id_seq'::regclass);


--
-- Name: stats_track_event_channel id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_channel ALTER COLUMN id SET DEFAULT nextval('public.stats_track_event_channel_id_seq'::regclass);


--
-- Name: stats_track_event_clip id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_clip ALTER COLUMN id SET DEFAULT nextval('public.stats_track_event_clip_id_seq'::regclass);


--
-- Name: stats_track_event_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_item ALTER COLUMN id SET DEFAULT nextval('public.stats_track_event_item_id_seq'::regclass);


--
-- Name: stats_track_event_playlist id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_playlist ALTER COLUMN id SET DEFAULT nextval('public.stats_track_event_playlist_id_seq'::regclass);


--
-- Name: account_app_store_purchase account_app_store_purchase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_app_store_purchase
    ADD CONSTRAINT account_app_store_purchase_pkey PRIMARY KEY (transaction_id);


--
-- Name: account_credentials account_credentials_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_credentials
    ADD CONSTRAINT account_credentials_account_id_key UNIQUE (account_id);


--
-- Name: account_credentials account_credentials_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_credentials
    ADD CONSTRAINT account_credentials_email_key UNIQUE (email);


--
-- Name: account_credentials account_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_credentials
    ADD CONSTRAINT account_credentials_pkey PRIMARY KEY (id);


--
-- Name: account_credentials account_credentials_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_credentials
    ADD CONSTRAINT account_credentials_username_key UNIQUE (username);


--
-- Name: account_email_change_verification account_email_change_verification_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_email_change_verification
    ADD CONSTRAINT account_email_change_verification_account_id_key UNIQUE (account_id);


--
-- Name: account_email_change_verification account_email_change_verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_email_change_verification
    ADD CONSTRAINT account_email_change_verification_pkey PRIMARY KEY (id);


--
-- Name: account_fcm_device account_fcm_device_fcm_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_fcm_device
    ADD CONSTRAINT account_fcm_device_fcm_token_key UNIQUE (fcm_token);


--
-- Name: account_fcm_device account_fcm_device_installation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_fcm_device
    ADD CONSTRAINT account_fcm_device_installation_id_key UNIQUE (installation_id);


--
-- Name: account_fcm_device account_fcm_device_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_fcm_device
    ADD CONSTRAINT account_fcm_device_pkey PRIMARY KEY (id);


--
-- Name: account_following_account account_following_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_following_account
    ADD CONSTRAINT account_following_account_pkey PRIMARY KEY (account_id, following_account_id);


--
-- Name: account_following_add_by_rss_channel account_following_add_by_rss_channel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_following_add_by_rss_channel
    ADD CONSTRAINT account_following_add_by_rss_channel_pkey PRIMARY KEY (account_id, feed_url);


--
-- Name: account_following_channel account_following_channel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_following_channel
    ADD CONSTRAINT account_following_channel_pkey PRIMARY KEY (account_id, channel_id);


--
-- Name: account_following_playlist account_following_playlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_following_playlist
    ADD CONSTRAINT account_following_playlist_pkey PRIMARY KEY (account_id, playlist_id);


--
-- Name: account_google_play_purchase account_google_play_purchase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_google_play_purchase
    ADD CONSTRAINT account_google_play_purchase_pkey PRIMARY KEY (transaction_id);


--
-- Name: account_google_play_purchase account_google_play_purchase_purchase_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_google_play_purchase
    ADD CONSTRAINT account_google_play_purchase_purchase_token_key UNIQUE (purchase_token);


--
-- Name: account account_id_text_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_id_text_key UNIQUE (id_text);


--
-- Name: account_membership account_membership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_membership
    ADD CONSTRAINT account_membership_pkey PRIMARY KEY (id);


--
-- Name: account_membership_status account_membership_status_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_membership_status
    ADD CONSTRAINT account_membership_status_account_id_key UNIQUE (account_id);


--
-- Name: account_membership_status account_membership_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_membership_status
    ADD CONSTRAINT account_membership_status_pkey PRIMARY KEY (id);


--
-- Name: account_membership account_membership_tier_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_membership
    ADD CONSTRAINT account_membership_tier_key UNIQUE (tier);


--
-- Name: account_metaboost account_metaboost_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_metaboost
    ADD CONSTRAINT account_metaboost_pkey PRIMARY KEY (account_id);


--
-- Name: account_metaboost account_metaboost_sender_guid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_metaboost
    ADD CONSTRAINT account_metaboost_sender_guid_key UNIQUE (sender_guid);


--
-- Name: account_notification_channel account_notification_channel_channel_id_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_notification_channel
    ADD CONSTRAINT account_notification_channel_channel_id_account_id_key UNIQUE (channel_id, account_id);


--
-- Name: account_notification_channel account_notification_channel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_notification_channel
    ADD CONSTRAINT account_notification_channel_pkey PRIMARY KEY (id);


--
-- Name: account_notification_channel_type account_notification_channel_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_notification_channel_type
    ADD CONSTRAINT account_notification_channel_type_pkey PRIMARY KEY (id);


--
-- Name: account_paypal_order account_paypal_order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_paypal_order
    ADD CONSTRAINT account_paypal_order_pkey PRIMARY KEY (payment_id);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: account_profile account_profile_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_profile
    ADD CONSTRAINT account_profile_account_id_key UNIQUE (account_id);


--
-- Name: account_profile account_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_profile
    ADD CONSTRAINT account_profile_pkey PRIMARY KEY (id);


--
-- Name: account_reset_password account_reset_password_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_reset_password
    ADD CONSTRAINT account_reset_password_account_id_key UNIQUE (account_id);


--
-- Name: account_reset_password account_reset_password_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_reset_password
    ADD CONSTRAINT account_reset_password_pkey PRIMARY KEY (id);


--
-- Name: account_set_password account_set_password_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_set_password
    ADD CONSTRAINT account_set_password_account_id_key UNIQUE (account_id);


--
-- Name: account_set_password account_set_password_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_set_password
    ADD CONSTRAINT account_set_password_pkey PRIMARY KEY (id);


--
-- Name: account_settings account_settings_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings
    ADD CONSTRAINT account_settings_account_id_key UNIQUE (account_id);


--
-- Name: account_settings_locale account_settings_locale_account_settings_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings_locale
    ADD CONSTRAINT account_settings_locale_account_settings_id_key UNIQUE (account_settings_id);


--
-- Name: account_settings_locale account_settings_locale_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings_locale
    ADD CONSTRAINT account_settings_locale_pkey PRIMARY KEY (id);


--
-- Name: account_settings_notification account_settings_notification_account_settings_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings_notification
    ADD CONSTRAINT account_settings_notification_account_settings_id_key UNIQUE (account_settings_id);


--
-- Name: account_settings_notification account_settings_notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings_notification
    ADD CONSTRAINT account_settings_notification_pkey PRIMARY KEY (id);


--
-- Name: account_settings_notification_type account_settings_notification_type_notification_id_type_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings_notification_type
    ADD CONSTRAINT account_settings_notification_type_notification_id_type_unique UNIQUE (account_settings_notification_id, type);


--
-- Name: account_settings_notification_type account_settings_notification_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings_notification_type
    ADD CONSTRAINT account_settings_notification_type_pkey PRIMARY KEY (id);


--
-- Name: account_settings account_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings
    ADD CONSTRAINT account_settings_pkey PRIMARY KEY (id);


--
-- Name: account_up_device account_up_device_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_up_device
    ADD CONSTRAINT account_up_device_account_id_key UNIQUE (account_id);


--
-- Name: account_up_device account_up_device_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_up_device
    ADD CONSTRAINT account_up_device_pkey PRIMARY KEY (id);


--
-- Name: account_up_device account_up_device_up_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_up_device
    ADD CONSTRAINT account_up_device_up_endpoint_key UNIQUE (up_endpoint);


--
-- Name: account_verification account_verification_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_verification
    ADD CONSTRAINT account_verification_account_id_key UNIQUE (account_id);


--
-- Name: account_verification account_verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_verification
    ADD CONSTRAINT account_verification_pkey PRIMARY KEY (id);


--
-- Name: account_webpush_device account_webpush_device_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_webpush_device
    ADD CONSTRAINT account_webpush_device_endpoint_key UNIQUE (endpoint);


--
-- Name: account_webpush_device account_webpush_device_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_webpush_device
    ADD CONSTRAINT account_webpush_device_pkey PRIMARY KEY (id);


--
-- Name: category category_display_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_display_name_key UNIQUE (display_name);


--
-- Name: category category_mapping_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_mapping_key_key UNIQUE (mapping_key);


--
-- Name: category category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_pkey PRIMARY KEY (id);


--
-- Name: category category_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_slug_key UNIQUE (slug);


--
-- Name: channel_about channel_about_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_about
    ADD CONSTRAINT channel_about_channel_id_key UNIQUE (channel_id);


--
-- Name: channel_about channel_about_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_about
    ADD CONSTRAINT channel_about_pkey PRIMARY KEY (id);


--
-- Name: channel_category channel_category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_category
    ADD CONSTRAINT channel_category_pkey PRIMARY KEY (id);


--
-- Name: channel_chat channel_chat_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_chat
    ADD CONSTRAINT channel_chat_channel_id_key UNIQUE (channel_id);


--
-- Name: channel_chat channel_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_chat
    ADD CONSTRAINT channel_chat_pkey PRIMARY KEY (id);


--
-- Name: channel_description channel_description_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_description
    ADD CONSTRAINT channel_description_channel_id_key UNIQUE (channel_id);


--
-- Name: channel_description channel_description_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_description
    ADD CONSTRAINT channel_description_pkey PRIMARY KEY (id);


--
-- Name: channel channel_feed_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT channel_feed_id_key UNIQUE (feed_id);


--
-- Name: channel_funding channel_funding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_funding
    ADD CONSTRAINT channel_funding_pkey PRIMARY KEY (id);


--
-- Name: channel channel_id_text_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT channel_id_text_key UNIQUE (id_text);


--
-- Name: channel_image channel_image_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_image
    ADD CONSTRAINT channel_image_pkey PRIMARY KEY (id);


--
-- Name: channel_internal_settings channel_internal_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_internal_settings
    ADD CONSTRAINT channel_internal_settings_pkey PRIMARY KEY (id);


--
-- Name: channel_itunes_type channel_itunes_type_itunes_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_itunes_type
    ADD CONSTRAINT channel_itunes_type_itunes_type_key UNIQUE (itunes_type);


--
-- Name: channel_itunes_type channel_itunes_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_itunes_type
    ADD CONSTRAINT channel_itunes_type_pkey PRIMARY KEY (id);


--
-- Name: channel_license channel_license_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_license
    ADD CONSTRAINT channel_license_channel_id_key UNIQUE (channel_id);


--
-- Name: channel_license channel_license_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_license
    ADD CONSTRAINT channel_license_pkey PRIMARY KEY (id);


--
-- Name: channel_location channel_location_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_location
    ADD CONSTRAINT channel_location_channel_id_key UNIQUE (channel_id);


--
-- Name: channel_location channel_location_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_location
    ADD CONSTRAINT channel_location_pkey PRIMARY KEY (id);


--
-- Name: channel_meta_boost channel_meta_boost_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_meta_boost
    ADD CONSTRAINT channel_meta_boost_channel_id_key UNIQUE (channel_id);


--
-- Name: channel_meta_boost channel_meta_boost_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_meta_boost
    ADD CONSTRAINT channel_meta_boost_pkey PRIMARY KEY (id);


--
-- Name: channel_person channel_person_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_person
    ADD CONSTRAINT channel_person_pkey PRIMARY KEY (id);


--
-- Name: channel channel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT channel_pkey PRIMARY KEY (id);


--
-- Name: channel channel_podcast_guid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT channel_podcast_guid_key UNIQUE (podcast_guid);


--
-- Name: channel_podroll channel_podroll_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_podroll
    ADD CONSTRAINT channel_podroll_channel_id_key UNIQUE (channel_id);


--
-- Name: channel_podroll channel_podroll_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_podroll
    ADD CONSTRAINT channel_podroll_pkey PRIMARY KEY (id);


--
-- Name: channel_podroll_remote_item channel_podroll_remote_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_podroll_remote_item
    ADD CONSTRAINT channel_podroll_remote_item_pkey PRIMARY KEY (id);


--
-- Name: channel_publisher channel_publisher_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_publisher
    ADD CONSTRAINT channel_publisher_channel_id_key UNIQUE (channel_id);


--
-- Name: channel_publisher channel_publisher_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_publisher
    ADD CONSTRAINT channel_publisher_pkey PRIMARY KEY (id);


--
-- Name: channel_publisher_remote_item channel_publisher_remote_item_channel_publisher_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_publisher_remote_item
    ADD CONSTRAINT channel_publisher_remote_item_channel_publisher_id_key UNIQUE (channel_publisher_id);


--
-- Name: channel_publisher_remote_item channel_publisher_remote_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_publisher_remote_item
    ADD CONSTRAINT channel_publisher_remote_item_pkey PRIMARY KEY (id);


--
-- Name: channel_remote_item channel_remote_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_remote_item
    ADD CONSTRAINT channel_remote_item_pkey PRIMARY KEY (id);


--
-- Name: channel_season channel_season_channel_id_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_season
    ADD CONSTRAINT channel_season_channel_id_number_key UNIQUE (channel_id, number);


--
-- Name: channel_season channel_season_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_season
    ADD CONSTRAINT channel_season_pkey PRIMARY KEY (id);


--
-- Name: channel_social_interact channel_social_interact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_social_interact
    ADD CONSTRAINT channel_social_interact_pkey PRIMARY KEY (id);


--
-- Name: channel_trailer channel_trailer_channel_id_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_trailer
    ADD CONSTRAINT channel_trailer_channel_id_url_key UNIQUE (channel_id, url);


--
-- Name: channel_trailer channel_trailer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_trailer
    ADD CONSTRAINT channel_trailer_pkey PRIMARY KEY (id);


--
-- Name: channel_txt channel_txt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_txt
    ADD CONSTRAINT channel_txt_pkey PRIMARY KEY (id);


--
-- Name: channel_value channel_value_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_value
    ADD CONSTRAINT channel_value_pkey PRIMARY KEY (id);


--
-- Name: channel_value_recipient channel_value_recipient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_value_recipient
    ADD CONSTRAINT channel_value_recipient_pkey PRIMARY KEY (id);


--
-- Name: clip clip_id_text_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clip
    ADD CONSTRAINT clip_id_text_key UNIQUE (id_text);


--
-- Name: clip clip_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clip
    ADD CONSTRAINT clip_pkey PRIMARY KEY (id);


--
-- Name: feed_flag_status feed_flag_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_flag_status
    ADD CONSTRAINT feed_flag_status_pkey PRIMARY KEY (id);


--
-- Name: feed_flag_status_reason feed_flag_status_reason_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_flag_status_reason
    ADD CONSTRAINT feed_flag_status_reason_pkey PRIMARY KEY (id);


--
-- Name: feed_flag_status_reason feed_flag_status_reason_reason_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_flag_status_reason
    ADD CONSTRAINT feed_flag_status_reason_reason_key UNIQUE (reason);


--
-- Name: feed_flag_status feed_flag_status_status_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_flag_status
    ADD CONSTRAINT feed_flag_status_status_key UNIQUE (status);


--
-- Name: feed_log feed_log_feed_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_log
    ADD CONSTRAINT feed_log_feed_id_key UNIQUE (feed_id);


--
-- Name: feed_log feed_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_log
    ADD CONSTRAINT feed_log_pkey PRIMARY KEY (id);


--
-- Name: feed feed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed
    ADD CONSTRAINT feed_pkey PRIMARY KEY (id);


--
-- Name: feed feed_podcast_index_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed
    ADD CONSTRAINT feed_podcast_index_id_key UNIQUE (podcast_index_id);


--
-- Name: feed feed_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed
    ADD CONSTRAINT feed_url_key UNIQUE (url);


--
-- Name: image_shrink_source image_shrink_source_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_shrink_source
    ADD CONSTRAINT image_shrink_source_pkey PRIMARY KEY (id);


--
-- Name: image_shrink_source image_shrink_source_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_shrink_source
    ADD CONSTRAINT image_shrink_source_url_key UNIQUE (url);


--
-- Name: item_about item_about_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_about
    ADD CONSTRAINT item_about_item_id_key UNIQUE (item_id);


--
-- Name: item_about item_about_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_about
    ADD CONSTRAINT item_about_pkey PRIMARY KEY (id);


--
-- Name: item_chapter item_chapter_id_text_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapter
    ADD CONSTRAINT item_chapter_id_text_key UNIQUE (id_text);


--
-- Name: item_chapter_location item_chapter_location_item_chapter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapter_location
    ADD CONSTRAINT item_chapter_location_item_chapter_id_key UNIQUE (item_chapter_id);


--
-- Name: item_chapter_location item_chapter_location_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapter_location
    ADD CONSTRAINT item_chapter_location_pkey PRIMARY KEY (id);


--
-- Name: item_chapter item_chapter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapter
    ADD CONSTRAINT item_chapter_pkey PRIMARY KEY (id);


--
-- Name: item_chapters_feed item_chapters_feed_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapters_feed
    ADD CONSTRAINT item_chapters_feed_item_id_key UNIQUE (item_id);


--
-- Name: item_chapters_feed_log item_chapters_feed_log_item_chapters_feed_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapters_feed_log
    ADD CONSTRAINT item_chapters_feed_log_item_chapters_feed_id_key UNIQUE (item_chapters_feed_id);


--
-- Name: item_chapters_feed_log item_chapters_feed_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapters_feed_log
    ADD CONSTRAINT item_chapters_feed_log_pkey PRIMARY KEY (id);


--
-- Name: item_chapters_feed item_chapters_feed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapters_feed
    ADD CONSTRAINT item_chapters_feed_pkey PRIMARY KEY (id);


--
-- Name: item_chapters_object item_chapters_object_item_chapters_feed_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapters_object
    ADD CONSTRAINT item_chapters_object_item_chapters_feed_id_key UNIQUE (item_chapters_feed_id);


--
-- Name: item_chapters_object item_chapters_object_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapters_object
    ADD CONSTRAINT item_chapters_object_pkey PRIMARY KEY (id);


--
-- Name: item_chat item_chat_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chat
    ADD CONSTRAINT item_chat_item_id_key UNIQUE (item_id);


--
-- Name: item_chat item_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chat
    ADD CONSTRAINT item_chat_pkey PRIMARY KEY (id);


--
-- Name: item_content_link item_content_link_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_content_link
    ADD CONSTRAINT item_content_link_pkey PRIMARY KEY (id);


--
-- Name: item_description item_description_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_description
    ADD CONSTRAINT item_description_item_id_key UNIQUE (item_id);


--
-- Name: item_description item_description_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_description
    ADD CONSTRAINT item_description_pkey PRIMARY KEY (id);


--
-- Name: item_enclosure_integrity item_enclosure_integrity_item_enclosure_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_enclosure_integrity
    ADD CONSTRAINT item_enclosure_integrity_item_enclosure_id_key UNIQUE (item_enclosure_id);


--
-- Name: item_enclosure_integrity item_enclosure_integrity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_enclosure_integrity
    ADD CONSTRAINT item_enclosure_integrity_pkey PRIMARY KEY (id);


--
-- Name: item_enclosure item_enclosure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_enclosure
    ADD CONSTRAINT item_enclosure_pkey PRIMARY KEY (id);


--
-- Name: item_enclosure_source item_enclosure_source_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_enclosure_source
    ADD CONSTRAINT item_enclosure_source_pkey PRIMARY KEY (id);


--
-- Name: item_flag_status item_flag_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_flag_status
    ADD CONSTRAINT item_flag_status_pkey PRIMARY KEY (id);


--
-- Name: item_flag_status item_flag_status_status_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_flag_status
    ADD CONSTRAINT item_flag_status_status_key UNIQUE (status);


--
-- Name: item_funding item_funding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_funding
    ADD CONSTRAINT item_funding_pkey PRIMARY KEY (id);


--
-- Name: item item_id_text_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_id_text_key UNIQUE (id_text);


--
-- Name: item_image item_image_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_image
    ADD CONSTRAINT item_image_pkey PRIMARY KEY (id);


--
-- Name: item_itunes_episode_type item_itunes_episode_type_itunes_episode_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_itunes_episode_type
    ADD CONSTRAINT item_itunes_episode_type_itunes_episode_type_key UNIQUE (itunes_episode_type);


--
-- Name: item_itunes_episode_type item_itunes_episode_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_itunes_episode_type
    ADD CONSTRAINT item_itunes_episode_type_pkey PRIMARY KEY (id);


--
-- Name: item_license item_license_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_license
    ADD CONSTRAINT item_license_item_id_key UNIQUE (item_id);


--
-- Name: item_license item_license_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_license
    ADD CONSTRAINT item_license_pkey PRIMARY KEY (id);


--
-- Name: item_location item_location_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_location
    ADD CONSTRAINT item_location_item_id_key UNIQUE (item_id);


--
-- Name: item_location item_location_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_location
    ADD CONSTRAINT item_location_pkey PRIMARY KEY (id);


--
-- Name: item_person item_person_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_person
    ADD CONSTRAINT item_person_pkey PRIMARY KEY (id);


--
-- Name: item item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_pkey PRIMARY KEY (id);


--
-- Name: item_season_episode item_season_episode_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_season_episode
    ADD CONSTRAINT item_season_episode_item_id_key UNIQUE (item_id);


--
-- Name: item_season_episode item_season_episode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_season_episode
    ADD CONSTRAINT item_season_episode_pkey PRIMARY KEY (id);


--
-- Name: item_season item_season_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_season
    ADD CONSTRAINT item_season_pkey PRIMARY KEY (id);


--
-- Name: item_social_interact item_social_interact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_social_interact
    ADD CONSTRAINT item_social_interact_pkey PRIMARY KEY (id);


--
-- Name: item_soundbite item_soundbite_id_text_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_soundbite
    ADD CONSTRAINT item_soundbite_id_text_key UNIQUE (id_text);


--
-- Name: item_soundbite item_soundbite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_soundbite
    ADD CONSTRAINT item_soundbite_pkey PRIMARY KEY (id);


--
-- Name: item_transcript item_transcript_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_transcript
    ADD CONSTRAINT item_transcript_pkey PRIMARY KEY (id);


--
-- Name: item_txt item_txt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_txt
    ADD CONSTRAINT item_txt_pkey PRIMARY KEY (id);


--
-- Name: item_value item_value_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value
    ADD CONSTRAINT item_value_pkey PRIMARY KEY (id);


--
-- Name: item_value_recipient item_value_recipient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value_recipient
    ADD CONSTRAINT item_value_recipient_pkey PRIMARY KEY (id);


--
-- Name: item_value_time_split item_value_time_split_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value_time_split
    ADD CONSTRAINT item_value_time_split_pkey PRIMARY KEY (id);


--
-- Name: item_value_time_split_recipient item_value_time_split_recipient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value_time_split_recipient
    ADD CONSTRAINT item_value_time_split_recipient_pkey PRIMARY KEY (id);


--
-- Name: item_value_time_split_remote_item item_value_time_split_remote_item_item_value_time_split_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value_time_split_remote_item
    ADD CONSTRAINT item_value_time_split_remote_item_item_value_time_split_id_key UNIQUE (item_value_time_split_id);


--
-- Name: item_value_time_split_remote_item item_value_time_split_remote_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value_time_split_remote_item
    ADD CONSTRAINT item_value_time_split_remote_item_pkey PRIMARY KEY (id);


--
-- Name: linear_migration_history linear_migration_history_migration_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linear_migration_history
    ADD CONSTRAINT linear_migration_history_migration_filename_key UNIQUE (migration_filename);


--
-- Name: linear_migration_history linear_migration_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linear_migration_history
    ADD CONSTRAINT linear_migration_history_pkey PRIMARY KEY (id);


--
-- Name: live_item live_item_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_item
    ADD CONSTRAINT live_item_item_id_key UNIQUE (item_id);


--
-- Name: live_item live_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_item
    ADD CONSTRAINT live_item_pkey PRIMARY KEY (id);


--
-- Name: live_item_status live_item_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_item_status
    ADD CONSTRAINT live_item_status_pkey PRIMARY KEY (id);


--
-- Name: live_item_status live_item_status_status_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_item_status
    ADD CONSTRAINT live_item_status_status_key UNIQUE (status);


--
-- Name: medium medium_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medium
    ADD CONSTRAINT medium_pkey PRIMARY KEY (id);


--
-- Name: medium medium_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medium
    ADD CONSTRAINT medium_value_key UNIQUE (value);


--
-- Name: membership_claim_token membership_claim_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_claim_token
    ADD CONSTRAINT membership_claim_token_pkey PRIMARY KEY (id);


--
-- Name: on_demand_parser_event on_demand_parser_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.on_demand_parser_event
    ADD CONSTRAINT on_demand_parser_event_pkey PRIMARY KEY (id);


--
-- Name: playlist playlist_id_text_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist
    ADD CONSTRAINT playlist_id_text_key UNIQUE (id_text);


--
-- Name: playlist playlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist
    ADD CONSTRAINT playlist_pkey PRIMARY KEY (id);


--
-- Name: playlist_resource playlist_resource_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_resource
    ADD CONSTRAINT playlist_resource_pkey PRIMARY KEY (id);


--
-- Name: playlist_resource playlist_resource_playlist_id_add_by_rss_hash_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_resource
    ADD CONSTRAINT playlist_resource_playlist_id_add_by_rss_hash_id_key UNIQUE (playlist_id, add_by_rss_hash_id);


--
-- Name: playlist_resource playlist_resource_playlist_id_clip_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_resource
    ADD CONSTRAINT playlist_resource_playlist_id_clip_id_key UNIQUE (playlist_id, clip_id);


--
-- Name: playlist_resource playlist_resource_playlist_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_resource
    ADD CONSTRAINT playlist_resource_playlist_id_item_id_key UNIQUE (playlist_id, item_id);


--
-- Name: playlist_resource playlist_resource_playlist_id_item_soundbite_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_resource
    ADD CONSTRAINT playlist_resource_playlist_id_item_soundbite_id_key UNIQUE (playlist_id, item_soundbite_id);


--
-- Name: playlist_resource playlist_resource_playlist_id_list_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_resource
    ADD CONSTRAINT playlist_resource_playlist_id_list_position_key UNIQUE (playlist_id, list_position);


--
-- Name: queue queue_account_id_medium_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_account_id_medium_id_key UNIQUE (account_id, medium_id);


--
-- Name: queue queue_id_text_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_id_text_key UNIQUE (id_text);


--
-- Name: queue queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_pkey PRIMARY KEY (id);


--
-- Name: queue_resource queue_resource_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_resource
    ADD CONSTRAINT queue_resource_pkey PRIMARY KEY (id);


--
-- Name: queue_resource queue_resource_queue_id_add_by_rss_hash_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_resource
    ADD CONSTRAINT queue_resource_queue_id_add_by_rss_hash_id_key UNIQUE (queue_id, add_by_rss_hash_id);


--
-- Name: queue_resource queue_resource_queue_id_clip_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_resource
    ADD CONSTRAINT queue_resource_queue_id_clip_id_key UNIQUE (queue_id, clip_id);


--
-- Name: queue_resource queue_resource_queue_id_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_resource
    ADD CONSTRAINT queue_resource_queue_id_item_id_key UNIQUE (queue_id, item_id);


--
-- Name: queue_resource queue_resource_queue_id_item_soundbite_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_resource
    ADD CONSTRAINT queue_resource_queue_id_item_soundbite_id_key UNIQUE (queue_id, item_soundbite_id);


--
-- Name: queue_resource queue_resource_queue_id_list_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_resource
    ADD CONSTRAINT queue_resource_queue_id_list_position_key UNIQUE (queue_id, list_position);


--
-- Name: sharable_status sharable_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sharable_status
    ADD CONSTRAINT sharable_status_pkey PRIMARY KEY (id);


--
-- Name: sharable_status sharable_status_status_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sharable_status
    ADD CONSTRAINT sharable_status_status_key UNIQUE (status);


--
-- Name: stats_aggregated_account stats_aggregated_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_account
    ADD CONSTRAINT stats_aggregated_account_pkey PRIMARY KEY (id);


--
-- Name: stats_aggregated_account stats_aggregated_account_tracked_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_account
    ADD CONSTRAINT stats_aggregated_account_tracked_account_id_key UNIQUE (tracked_account_id);


--
-- Name: stats_aggregated_channel stats_aggregated_channel_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_channel
    ADD CONSTRAINT stats_aggregated_channel_channel_id_key UNIQUE (channel_id);


--
-- Name: stats_aggregated_channel stats_aggregated_channel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_channel
    ADD CONSTRAINT stats_aggregated_channel_pkey PRIMARY KEY (id);


--
-- Name: stats_aggregated_clip stats_aggregated_clip_clip_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_clip
    ADD CONSTRAINT stats_aggregated_clip_clip_id_key UNIQUE (clip_id);


--
-- Name: stats_aggregated_clip stats_aggregated_clip_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_clip
    ADD CONSTRAINT stats_aggregated_clip_pkey PRIMARY KEY (id);


--
-- Name: stats_aggregated_item stats_aggregated_item_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_item
    ADD CONSTRAINT stats_aggregated_item_item_id_key UNIQUE (item_id);


--
-- Name: stats_aggregated_item stats_aggregated_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_item
    ADD CONSTRAINT stats_aggregated_item_pkey PRIMARY KEY (id);


--
-- Name: stats_aggregated_playlist stats_aggregated_playlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_playlist
    ADD CONSTRAINT stats_aggregated_playlist_pkey PRIMARY KEY (id);


--
-- Name: stats_aggregated_playlist stats_aggregated_playlist_playlist_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_playlist
    ADD CONSTRAINT stats_aggregated_playlist_playlist_id_key UNIQUE (playlist_id);


--
-- Name: stats_track_account_guid stats_track_account_guid_account_guid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_account_guid
    ADD CONSTRAINT stats_track_account_guid_account_guid_key UNIQUE (account_guid);


--
-- Name: stats_track_account_guid stats_track_account_guid_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_account_guid
    ADD CONSTRAINT stats_track_account_guid_account_id_key UNIQUE (account_id);


--
-- Name: stats_track_account_guid stats_track_account_guid_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_account_guid
    ADD CONSTRAINT stats_track_account_guid_pkey PRIMARY KEY (id);


--
-- Name: stats_track_event_account stats_track_event_account_account_guid_tracked_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_account
    ADD CONSTRAINT stats_track_event_account_account_guid_tracked_account_id_key UNIQUE (account_guid, tracked_account_id);


--
-- Name: stats_track_event_account stats_track_event_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_account
    ADD CONSTRAINT stats_track_event_account_pkey PRIMARY KEY (id);


--
-- Name: stats_track_event_channel stats_track_event_channel_account_guid_channel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_channel
    ADD CONSTRAINT stats_track_event_channel_account_guid_channel_id_key UNIQUE (account_guid, channel_id);


--
-- Name: stats_track_event_channel stats_track_event_channel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_channel
    ADD CONSTRAINT stats_track_event_channel_pkey PRIMARY KEY (id);


--
-- Name: stats_track_event_clip stats_track_event_clip_account_guid_clip_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_clip
    ADD CONSTRAINT stats_track_event_clip_account_guid_clip_id_key UNIQUE (account_guid, clip_id);


--
-- Name: stats_track_event_clip stats_track_event_clip_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_clip
    ADD CONSTRAINT stats_track_event_clip_pkey PRIMARY KEY (id);


--
-- Name: stats_track_event_item stats_track_event_item_account_guid_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_item
    ADD CONSTRAINT stats_track_event_item_account_guid_item_id_key UNIQUE (account_guid, item_id);


--
-- Name: stats_track_event_item stats_track_event_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_item
    ADD CONSTRAINT stats_track_event_item_pkey PRIMARY KEY (id);


--
-- Name: stats_track_event_playlist stats_track_event_playlist_account_guid_playlist_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_playlist
    ADD CONSTRAINT stats_track_event_playlist_account_guid_playlist_id_key UNIQUE (account_guid, playlist_id);


--
-- Name: stats_track_event_playlist stats_track_event_playlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_playlist
    ADD CONSTRAINT stats_track_event_playlist_pkey PRIMARY KEY (id);


--
-- Name: channel_podcast_guid_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX channel_podcast_guid_unique ON public.channel USING btree (podcast_guid) WHERE (podcast_guid IS NOT NULL);


--
-- Name: channel_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX channel_slug ON public.channel USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: idx_account_app_store_purchase_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_app_store_purchase_account_id ON public.account_app_store_purchase USING btree (account_id);


--
-- Name: idx_account_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_created_at ON public.account USING btree (created_at DESC);


--
-- Name: idx_account_credentials_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_credentials_account_id ON public.account_credentials USING btree (account_id);


--
-- Name: idx_account_email_change_verification_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_email_change_verification_id ON public.account_email_change_verification USING btree (account_id);


--
-- Name: idx_account_fcm_device_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_fcm_device_account_id ON public.account_fcm_device USING btree (account_id);


--
-- Name: idx_account_fcm_device_fcm_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_fcm_device_fcm_token ON public.account_fcm_device USING btree (fcm_token);


--
-- Name: idx_account_fcm_device_installation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_fcm_device_installation_id ON public.account_fcm_device USING btree (installation_id);


--
-- Name: idx_account_fcm_device_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_fcm_device_platform ON public.account_fcm_device USING btree (platform);


--
-- Name: idx_account_following_account_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_following_account_account_id ON public.account_following_account USING btree (account_id);


--
-- Name: idx_account_following_account_following_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_following_account_following_account_id ON public.account_following_account USING btree (following_account_id);


--
-- Name: idx_account_following_add_by_rss_channel_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_following_add_by_rss_channel_account_id ON public.account_following_add_by_rss_channel USING btree (account_id);


--
-- Name: idx_account_following_channel_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_following_channel_account_id ON public.account_following_channel USING btree (account_id);


--
-- Name: idx_account_following_channel_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_following_channel_channel_id ON public.account_following_channel USING btree (channel_id);


--
-- Name: idx_account_following_playlist_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_following_playlist_account_id ON public.account_following_playlist USING btree (account_id);


--
-- Name: idx_account_following_playlist_playlist_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_following_playlist_playlist_id ON public.account_following_playlist USING btree (playlist_id);


--
-- Name: idx_account_google_play_purchase_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_google_play_purchase_account_id ON public.account_google_play_purchase USING btree (account_id);


--
-- Name: idx_account_membership_status_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_membership_status_account_id ON public.account_membership_status USING btree (account_id);


--
-- Name: idx_account_membership_status_account_membership_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_membership_status_account_membership_id ON public.account_membership_status USING btree (account_membership_id);


--
-- Name: idx_account_metaboost_sender_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_metaboost_sender_guid ON public.account_metaboost USING btree (sender_guid);


--
-- Name: idx_account_notification_channel_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_notification_channel_account_id ON public.account_notification_channel USING btree (account_id);


--
-- Name: idx_account_notification_channel_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_notification_channel_channel_id ON public.account_notification_channel USING btree (channel_id);


--
-- Name: idx_account_paypal_order_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_paypal_order_account_id ON public.account_paypal_order USING btree (account_id);


--
-- Name: idx_account_profile_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_profile_account_id ON public.account_profile USING btree (account_id);


--
-- Name: idx_account_reset_password_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_reset_password_account_id ON public.account_reset_password USING btree (account_id);


--
-- Name: idx_account_set_password_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_set_password_account_id ON public.account_set_password USING btree (account_id);


--
-- Name: idx_account_sharable_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_sharable_status_id ON public.account USING btree (sharable_status_id);


--
-- Name: idx_account_up_device_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_up_device_account_id ON public.account_up_device USING btree (account_id);


--
-- Name: idx_account_up_device_up_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_up_device_up_endpoint ON public.account_up_device USING btree (up_endpoint);


--
-- Name: idx_account_verification_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_verification_account_id ON public.account_verification USING btree (account_id);


--
-- Name: idx_account_webpush_device_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_webpush_device_account_id ON public.account_webpush_device USING btree (account_id);


--
-- Name: idx_account_webpush_device_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_webpush_device_endpoint ON public.account_webpush_device USING btree (endpoint);


--
-- Name: idx_category_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category_parent_id ON public.category USING btree (parent_id);


--
-- Name: idx_channel_about_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_about_channel_id ON public.channel_about USING btree (channel_id);


--
-- Name: idx_channel_about_itunes_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_about_itunes_type_id ON public.channel_about USING btree (itunes_type_id);


--
-- Name: idx_channel_about_last_pub_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_about_last_pub_date ON public.channel_about USING btree (last_pub_date);


--
-- Name: idx_channel_category_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_category_category_id ON public.channel_category USING btree (category_id);


--
-- Name: idx_channel_category_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_category_channel_id ON public.channel_category USING btree (channel_id);


--
-- Name: idx_channel_chat_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_chat_channel_id ON public.channel_chat USING btree (channel_id);


--
-- Name: idx_channel_description_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_description_channel_id ON public.channel_description USING btree (channel_id);


--
-- Name: idx_channel_feed_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_feed_id ON public.channel USING btree (feed_id);


--
-- Name: idx_channel_funding_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_funding_channel_id ON public.channel_funding USING btree (channel_id);


--
-- Name: idx_channel_image_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_image_channel_id ON public.channel_image USING btree (channel_id);


--
-- Name: idx_channel_internal_settings_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_internal_settings_channel_id ON public.channel_internal_settings USING btree (channel_id);


--
-- Name: idx_channel_license_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_license_channel_id ON public.channel_license USING btree (channel_id);


--
-- Name: idx_channel_location_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_location_channel_id ON public.channel_location USING btree (channel_id);


--
-- Name: idx_channel_medium_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_medium_id ON public.channel USING btree (medium_id);


--
-- Name: idx_channel_person_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_person_channel_id ON public.channel_person USING btree (channel_id);


--
-- Name: idx_channel_podroll_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_podroll_channel_id ON public.channel_podroll USING btree (channel_id);


--
-- Name: idx_channel_podroll_remote_item_channel_podroll_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_podroll_remote_item_channel_podroll_id ON public.channel_podroll_remote_item USING btree (channel_podroll_id);


--
-- Name: idx_channel_podroll_remote_item_feed_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_podroll_remote_item_feed_guid ON public.channel_podroll_remote_item USING btree (feed_guid);


--
-- Name: idx_channel_podroll_remote_item_feed_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_podroll_remote_item_feed_url ON public.channel_podroll_remote_item USING btree (feed_url);


--
-- Name: idx_channel_podroll_remote_item_item_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_podroll_remote_item_item_guid ON public.channel_podroll_remote_item USING btree (item_guid);


--
-- Name: idx_channel_podroll_remote_item_medium_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_podroll_remote_item_medium_id ON public.channel_podroll_remote_item USING btree (medium_id);


--
-- Name: idx_channel_publisher_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_publisher_channel_id ON public.channel_publisher USING btree (channel_id);


--
-- Name: idx_channel_publisher_remote_item_channel_publisher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_publisher_remote_item_channel_publisher_id ON public.channel_publisher_remote_item USING btree (channel_publisher_id);


--
-- Name: idx_channel_publisher_remote_item_feed_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_publisher_remote_item_feed_guid ON public.channel_publisher_remote_item USING btree (feed_guid);


--
-- Name: idx_channel_publisher_remote_item_feed_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_publisher_remote_item_feed_url ON public.channel_publisher_remote_item USING btree (feed_url);


--
-- Name: idx_channel_publisher_remote_item_item_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_publisher_remote_item_item_guid ON public.channel_publisher_remote_item USING btree (item_guid);


--
-- Name: idx_channel_publisher_remote_item_medium_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_publisher_remote_item_medium_id ON public.channel_publisher_remote_item USING btree (medium_id);


--
-- Name: idx_channel_remote_item_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_remote_item_channel_id ON public.channel_remote_item USING btree (channel_id);


--
-- Name: idx_channel_remote_item_feed_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_remote_item_feed_guid ON public.channel_remote_item USING btree (feed_guid);


--
-- Name: idx_channel_remote_item_feed_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_remote_item_feed_url ON public.channel_remote_item USING btree (feed_url);


--
-- Name: idx_channel_remote_item_item_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_remote_item_item_guid ON public.channel_remote_item USING btree (item_guid);


--
-- Name: idx_channel_remote_item_medium_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_remote_item_medium_id ON public.channel_remote_item USING btree (medium_id);


--
-- Name: idx_channel_season_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_season_channel_id ON public.channel_season USING btree (channel_id);


--
-- Name: idx_channel_social_interact_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_social_interact_channel_id ON public.channel_social_interact USING btree (channel_id);


--
-- Name: idx_channel_trailer_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_trailer_channel_id ON public.channel_trailer USING btree (channel_id);


--
-- Name: idx_channel_trailer_channel_season_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_trailer_channel_season_id ON public.channel_trailer USING btree (channel_season_id);


--
-- Name: idx_channel_txt_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_txt_channel_id ON public.channel_txt USING btree (channel_id);


--
-- Name: idx_channel_value_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_value_channel_id ON public.channel_value USING btree (channel_id);


--
-- Name: idx_channel_value_recipient_channel_value_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_value_recipient_channel_value_id ON public.channel_value_recipient USING btree (channel_value_id);


--
-- Name: idx_clip_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clip_account_id ON public.clip USING btree (account_id);


--
-- Name: idx_clip_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clip_created_at ON public.clip USING btree (created_at);


--
-- Name: idx_clip_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clip_item_id ON public.clip USING btree (item_id);


--
-- Name: idx_clip_sharable_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clip_sharable_status_id ON public.clip USING btree (sharable_status_id);


--
-- Name: idx_feed_feed_flag_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feed_feed_flag_status_id ON public.feed USING btree (feed_flag_status_id);


--
-- Name: idx_feed_feed_flag_status_reason_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feed_feed_flag_status_reason_id ON public.feed USING btree (feed_flag_status_reason_id);


--
-- Name: idx_feed_log_feed_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feed_log_feed_id ON public.feed_log USING btree (feed_id);


--
-- Name: idx_image_shrink_source_last_checked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_shrink_source_last_checked_at ON public.image_shrink_source USING btree (last_checked_at DESC);


--
-- Name: idx_item_about_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_about_item_id ON public.item_about USING btree (item_id);


--
-- Name: idx_item_about_item_itunes_episode_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_about_item_itunes_episode_type_id ON public.item_about USING btree (item_itunes_episode_type_id);


--
-- Name: idx_item_channel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_channel_id ON public.item USING btree (channel_id);


--
-- Name: idx_item_chapter_item_chapters_object_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_chapter_item_chapters_object_id ON public.item_chapter USING btree (item_chapters_object_id);


--
-- Name: idx_item_chapter_location_item_chapter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_chapter_location_item_chapter_id ON public.item_chapter_location USING btree (item_chapter_id);


--
-- Name: idx_item_chapters_feed_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_chapters_feed_item_id ON public.item_chapters_feed USING btree (item_id);


--
-- Name: idx_item_chapters_feed_log_item_chapters_feed_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_chapters_feed_log_item_chapters_feed_id ON public.item_chapters_feed_log USING btree (item_chapters_feed_id);


--
-- Name: idx_item_chapters_object_item_chapters_feed_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_chapters_object_item_chapters_feed_id ON public.item_chapters_object USING btree (item_chapters_feed_id);


--
-- Name: idx_item_chat_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_chat_item_id ON public.item_chat USING btree (item_id);


--
-- Name: idx_item_content_link_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_content_link_item_id ON public.item_content_link USING btree (item_id);


--
-- Name: idx_item_description_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_description_item_id ON public.item_description USING btree (item_id);


--
-- Name: idx_item_enclosure_integrity_item_enclosure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_enclosure_integrity_item_enclosure_id ON public.item_enclosure_integrity USING btree (item_enclosure_id);


--
-- Name: idx_item_enclosure_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_enclosure_item_id ON public.item_enclosure USING btree (item_id);


--
-- Name: idx_item_enclosure_source_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_enclosure_source_item_id ON public.item_enclosure_source USING btree (item_enclosure_id);


--
-- Name: idx_item_funding_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_funding_item_id ON public.item_funding USING btree (item_id);


--
-- Name: idx_item_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_guid ON public.item USING btree (guid);


--
-- Name: idx_item_guid_enclosure_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_guid_enclosure_url ON public.item USING btree (guid_enclosure_url);


--
-- Name: idx_item_image_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_image_item_id ON public.item_image USING btree (item_id);


--
-- Name: idx_item_item_flag_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_item_flag_status_id ON public.item USING btree (item_flag_status_id);


--
-- Name: idx_item_license_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_license_item_id ON public.item_license USING btree (item_id);


--
-- Name: idx_item_location_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_location_item_id ON public.item_location USING btree (item_id);


--
-- Name: idx_item_person_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_person_item_id ON public.item_person USING btree (item_id);


--
-- Name: idx_item_pub_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_pub_date ON public.item USING btree (pub_date);


--
-- Name: idx_item_season_channel_season_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_season_channel_season_id ON public.item_season USING btree (channel_season_id);


--
-- Name: idx_item_season_episode_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_season_episode_item_id ON public.item_season_episode USING btree (item_id);


--
-- Name: idx_item_season_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_season_item_id ON public.item_season USING btree (item_id);


--
-- Name: idx_item_social_interact_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_social_interact_item_id ON public.item_social_interact USING btree (item_id);


--
-- Name: idx_item_soundbite_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_soundbite_item_id ON public.item_soundbite USING btree (item_id);


--
-- Name: idx_item_transcript_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_transcript_item_id ON public.item_transcript USING btree (item_id);


--
-- Name: idx_item_txt_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_txt_item_id ON public.item_txt USING btree (item_id);


--
-- Name: idx_item_value_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_value_item_id ON public.item_value USING btree (item_id);


--
-- Name: idx_item_value_recipient_item_value_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_value_recipient_item_value_id ON public.item_value_recipient USING btree (item_value_id);


--
-- Name: idx_item_value_time_split_item_value_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_value_time_split_item_value_id ON public.item_value_time_split USING btree (item_value_id);


--
-- Name: idx_item_value_time_split_recipient_item_value_time_split_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_value_time_split_recipient_item_value_time_split_id ON public.item_value_time_split_recipient USING btree (item_value_time_split_id);


--
-- Name: idx_item_value_time_split_remote_item_feed_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_value_time_split_remote_item_feed_guid ON public.item_value_time_split_remote_item USING btree (feed_guid);


--
-- Name: idx_item_value_time_split_remote_item_feed_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_value_time_split_remote_item_feed_url ON public.item_value_time_split_remote_item USING btree (feed_url);


--
-- Name: idx_item_value_time_split_remote_item_item_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_value_time_split_remote_item_item_guid ON public.item_value_time_split_remote_item USING btree (item_guid);


--
-- Name: idx_item_value_time_split_remote_item_item_value_time_split_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_value_time_split_remote_item_item_value_time_split_id ON public.item_value_time_split_remote_item USING btree (item_value_time_split_id);


--
-- Name: idx_linear_migration_history_applied_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linear_migration_history_applied_at ON public.linear_migration_history USING btree (applied_at DESC);


--
-- Name: idx_live_item_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_live_item_item_id ON public.live_item USING btree (item_id);


--
-- Name: idx_live_item_live_item_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_live_item_live_item_status_id ON public.live_item USING btree (live_item_status_id);


--
-- Name: idx_membership_claim_token_account_membership_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_membership_claim_token_account_membership_id ON public.membership_claim_token USING btree (account_membership_id);


--
-- Name: idx_on_demand_parser_event_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_on_demand_parser_event_account_id ON public.on_demand_parser_event USING btree (account_id);


--
-- Name: idx_on_demand_parser_event_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_on_demand_parser_event_created_at ON public.on_demand_parser_event USING btree (created_at DESC);


--
-- Name: idx_on_demand_parser_event_podcast_index_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_on_demand_parser_event_podcast_index_id ON public.on_demand_parser_event USING btree (podcast_index_id);


--
-- Name: idx_on_demand_parser_event_remote_parent_podcast_index_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_on_demand_parser_event_remote_parent_podcast_index_id ON public.on_demand_parser_event USING btree (remote_parent_podcast_index_id);


--
-- Name: idx_on_demand_parser_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_on_demand_parser_event_type ON public.on_demand_parser_event USING btree (type);


--
-- Name: idx_playlist_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_playlist_account_id ON public.playlist USING btree (account_id);


--
-- Name: idx_playlist_account_medium_default_likes; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_playlist_account_medium_default_likes ON public.playlist USING btree (account_id, medium_id) WHERE (is_default_likes = true);


--
-- Name: idx_playlist_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_playlist_last_updated ON public.playlist USING btree (last_updated);


--
-- Name: idx_playlist_medium_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_playlist_medium_id ON public.playlist USING btree (medium_id);


--
-- Name: idx_playlist_resource_clip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_playlist_resource_clip_id ON public.playlist_resource USING btree (clip_id);


--
-- Name: idx_playlist_resource_hash_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_playlist_resource_hash_id ON public.playlist_resource USING btree (add_by_rss_hash_id);


--
-- Name: idx_playlist_resource_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_playlist_resource_item_id ON public.playlist_resource USING btree (item_id);


--
-- Name: idx_playlist_resource_playlist_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_playlist_resource_playlist_id ON public.playlist_resource USING btree (playlist_id);


--
-- Name: idx_playlist_resource_soundbite_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_playlist_resource_soundbite_id ON public.playlist_resource USING btree (item_soundbite_id);


--
-- Name: idx_playlist_sharable_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_playlist_sharable_status_id ON public.playlist USING btree (sharable_status_id);


--
-- Name: idx_queue_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_account_id ON public.queue USING btree (account_id);


--
-- Name: idx_queue_medium_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_medium_id ON public.queue USING btree (medium_id);


--
-- Name: idx_queue_resource_add_by_rss_hash_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_resource_add_by_rss_hash_id ON public.queue_resource USING btree (add_by_rss_hash_id);


--
-- Name: idx_queue_resource_clip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_resource_clip_id ON public.queue_resource USING btree (clip_id);


--
-- Name: idx_queue_resource_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_resource_item_id ON public.queue_resource USING btree (item_id);


--
-- Name: idx_queue_resource_queue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_resource_queue_id ON public.queue_resource USING btree (queue_id);


--
-- Name: idx_queue_resource_soundbite_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_resource_soundbite_id ON public.queue_resource USING btree (item_soundbite_id);


--
-- Name: item_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX item_slug ON public.item USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: stats_aggregated_account_all_time_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_account_all_time_count_idx ON public.stats_aggregated_account USING btree (all_time_count);


--
-- Name: stats_aggregated_account_day_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_account_day_current_count_idx ON public.stats_aggregated_account USING btree (day_current_count);


--
-- Name: stats_aggregated_account_month_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_account_month_current_count_idx ON public.stats_aggregated_account USING btree (month_current_count);


--
-- Name: stats_aggregated_account_tracked_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_account_tracked_account_id_idx ON public.stats_aggregated_account USING btree (tracked_account_id);


--
-- Name: stats_aggregated_account_week_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_account_week_current_count_idx ON public.stats_aggregated_account USING btree (week_current_count);


--
-- Name: stats_aggregated_channel_all_time_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_channel_all_time_count_idx ON public.stats_aggregated_channel USING btree (all_time_count);


--
-- Name: stats_aggregated_channel_channel_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_channel_channel_id_idx ON public.stats_aggregated_channel USING btree (channel_id);


--
-- Name: stats_aggregated_channel_day_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_channel_day_current_count_idx ON public.stats_aggregated_channel USING btree (day_current_count);


--
-- Name: stats_aggregated_channel_month_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_channel_month_current_count_idx ON public.stats_aggregated_channel USING btree (month_current_count);


--
-- Name: stats_aggregated_channel_week_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_channel_week_current_count_idx ON public.stats_aggregated_channel USING btree (week_current_count);


--
-- Name: stats_aggregated_clip_all_time_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_clip_all_time_count_idx ON public.stats_aggregated_clip USING btree (all_time_count);


--
-- Name: stats_aggregated_clip_clip_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_clip_clip_id_idx ON public.stats_aggregated_clip USING btree (clip_id);


--
-- Name: stats_aggregated_clip_day_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_clip_day_current_count_idx ON public.stats_aggregated_clip USING btree (day_current_count);


--
-- Name: stats_aggregated_clip_month_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_clip_month_current_count_idx ON public.stats_aggregated_clip USING btree (month_current_count);


--
-- Name: stats_aggregated_clip_week_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_clip_week_current_count_idx ON public.stats_aggregated_clip USING btree (week_current_count);


--
-- Name: stats_aggregated_item_all_time_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_item_all_time_count_idx ON public.stats_aggregated_item USING btree (all_time_count);


--
-- Name: stats_aggregated_item_day_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_item_day_current_count_idx ON public.stats_aggregated_item USING btree (day_current_count);


--
-- Name: stats_aggregated_item_item_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_item_item_id_idx ON public.stats_aggregated_item USING btree (item_id);


--
-- Name: stats_aggregated_item_month_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_item_month_current_count_idx ON public.stats_aggregated_item USING btree (month_current_count);


--
-- Name: stats_aggregated_item_week_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_item_week_current_count_idx ON public.stats_aggregated_item USING btree (week_current_count);


--
-- Name: stats_aggregated_playlist_all_time_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_playlist_all_time_count_idx ON public.stats_aggregated_playlist USING btree (all_time_count);


--
-- Name: stats_aggregated_playlist_day_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_playlist_day_current_count_idx ON public.stats_aggregated_playlist USING btree (day_current_count);


--
-- Name: stats_aggregated_playlist_month_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_playlist_month_current_count_idx ON public.stats_aggregated_playlist USING btree (month_current_count);


--
-- Name: stats_aggregated_playlist_playlist_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_playlist_playlist_id_idx ON public.stats_aggregated_playlist USING btree (playlist_id);


--
-- Name: stats_aggregated_playlist_week_current_count_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_aggregated_playlist_week_current_count_idx ON public.stats_aggregated_playlist USING btree (week_current_count);


--
-- Name: stats_track_account_guid_account_guid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_account_guid_account_guid_idx ON public.stats_track_account_guid USING btree (account_guid);


--
-- Name: stats_track_account_guid_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_account_guid_account_id_idx ON public.stats_track_account_guid USING btree (account_id);


--
-- Name: stats_track_account_guid_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_account_guid_updated_at_idx ON public.stats_track_account_guid USING btree (updated_at);


--
-- Name: stats_track_event_account_account_guid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_account_account_guid_idx ON public.stats_track_event_account USING btree (account_guid);


--
-- Name: stats_track_event_account_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_account_created_at_idx ON public.stats_track_event_account USING btree (created_at);


--
-- Name: stats_track_event_account_tracked_account_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_account_tracked_account_id_idx ON public.stats_track_event_account USING btree (tracked_account_id);


--
-- Name: stats_track_event_channel_account_guid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_channel_account_guid_idx ON public.stats_track_event_channel USING btree (account_guid);


--
-- Name: stats_track_event_channel_channel_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_channel_channel_id_idx ON public.stats_track_event_channel USING btree (channel_id);


--
-- Name: stats_track_event_channel_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_channel_created_at_idx ON public.stats_track_event_channel USING btree (created_at);


--
-- Name: stats_track_event_clip_account_guid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_clip_account_guid_idx ON public.stats_track_event_clip USING btree (account_guid);


--
-- Name: stats_track_event_clip_clip_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_clip_clip_id_idx ON public.stats_track_event_clip USING btree (clip_id);


--
-- Name: stats_track_event_clip_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_clip_created_at_idx ON public.stats_track_event_clip USING btree (created_at);


--
-- Name: stats_track_event_item_account_guid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_item_account_guid_idx ON public.stats_track_event_item USING btree (account_guid);


--
-- Name: stats_track_event_item_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_item_created_at_idx ON public.stats_track_event_item USING btree (created_at);


--
-- Name: stats_track_event_item_item_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_item_item_id_idx ON public.stats_track_event_item USING btree (item_id);


--
-- Name: stats_track_event_playlist_account_guid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_playlist_account_guid_idx ON public.stats_track_event_playlist USING btree (account_guid);


--
-- Name: stats_track_event_playlist_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_playlist_created_at_idx ON public.stats_track_event_playlist USING btree (created_at);


--
-- Name: stats_track_event_playlist_playlist_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stats_track_event_playlist_playlist_id_idx ON public.stats_track_event_playlist USING btree (playlist_id);


--
-- Name: uq_channel_podroll_remote_item_feed_guid_item_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_channel_podroll_remote_item_feed_guid_item_guid ON public.channel_podroll_remote_item USING btree (channel_podroll_id, feed_guid, item_guid) WHERE (item_guid IS NOT NULL);


--
-- Name: uq_channel_podroll_remote_item_feed_guid_no_item_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_channel_podroll_remote_item_feed_guid_no_item_guid ON public.channel_podroll_remote_item USING btree (channel_podroll_id, feed_guid) WHERE (item_guid IS NULL);


--
-- Name: uq_channel_publisher_remote_item_feed_guid_item_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_channel_publisher_remote_item_feed_guid_item_guid ON public.channel_publisher_remote_item USING btree (channel_publisher_id, feed_guid, item_guid) WHERE (item_guid IS NOT NULL);


--
-- Name: uq_channel_publisher_remote_item_feed_guid_no_item_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_channel_publisher_remote_item_feed_guid_no_item_guid ON public.channel_publisher_remote_item USING btree (channel_publisher_id, feed_guid) WHERE (item_guid IS NULL);


--
-- Name: uq_channel_remote_item_feed_guid_item_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_channel_remote_item_feed_guid_item_guid ON public.channel_remote_item USING btree (channel_id, feed_guid, item_guid) WHERE (item_guid IS NOT NULL);


--
-- Name: uq_channel_remote_item_feed_guid_no_item_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_channel_remote_item_feed_guid_no_item_guid ON public.channel_remote_item USING btree (channel_id, feed_guid) WHERE (item_guid IS NULL);


--
-- Name: uq_item_value_time_split_remote_item_feed_guid_item_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_item_value_time_split_remote_item_feed_guid_item_guid ON public.item_value_time_split_remote_item USING btree (item_value_time_split_id, feed_guid, item_guid) WHERE (item_guid IS NOT NULL);


--
-- Name: uq_item_value_time_split_remote_item_feed_guid_no_item_guid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_item_value_time_split_remote_item_feed_guid_no_item_guid ON public.item_value_time_split_remote_item USING btree (item_value_time_split_id, feed_guid) WHERE (item_guid IS NULL);


--
-- Name: playlist_resource playlist_resource_limit_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER playlist_resource_limit_trigger BEFORE INSERT ON public.playlist_resource FOR EACH ROW EXECUTE FUNCTION public.enforce_playlist_resource_limit();


--
-- Name: queue_resource queue_resource_limit_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER queue_resource_limit_trigger BEFORE INSERT ON public.queue_resource FOR EACH ROW EXECUTE FUNCTION public.enforce_queue_resource_limit();


--
-- Name: account_fcm_device set_updated_at_account_fcm_device; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_account_fcm_device BEFORE UPDATE ON public.account_fcm_device FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();


--
-- Name: account_up_device set_updated_at_account_up_device; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_account_up_device BEFORE UPDATE ON public.account_up_device FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();


--
-- Name: account_webpush_device set_updated_at_account_webpush_device; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_account_webpush_device BEFORE UPDATE ON public.account_webpush_device FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();


--
-- Name: feed set_updated_at_feed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_feed BEFORE UPDATE ON public.feed FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();


--
-- Name: feed_flag_status set_updated_at_feed_flag_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_feed_flag_status BEFORE UPDATE ON public.feed_flag_status FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();


--
-- Name: feed_flag_status_reason set_updated_at_feed_flag_status_reason; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_feed_flag_status_reason BEFORE UPDATE ON public.feed_flag_status_reason FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();


--
-- Name: image_shrink_source set_updated_at_image_shrink_source; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_image_shrink_source BEFORE UPDATE ON public.image_shrink_source FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();


--
-- Name: item_flag_status set_updated_at_item_flag_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_item_flag_status BEFORE UPDATE ON public.item_flag_status FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_field();


--
-- Name: account_app_store_purchase account_app_store_purchase_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_app_store_purchase
    ADD CONSTRAINT account_app_store_purchase_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_credentials account_credentials_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_credentials
    ADD CONSTRAINT account_credentials_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_email_change_verification account_email_change_verification_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_email_change_verification
    ADD CONSTRAINT account_email_change_verification_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_fcm_device account_fcm_device_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_fcm_device
    ADD CONSTRAINT account_fcm_device_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_following_account account_following_account_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_following_account
    ADD CONSTRAINT account_following_account_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_following_account account_following_account_following_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_following_account
    ADD CONSTRAINT account_following_account_following_account_id_fkey FOREIGN KEY (following_account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_following_add_by_rss_channel account_following_add_by_rss_channel_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_following_add_by_rss_channel
    ADD CONSTRAINT account_following_add_by_rss_channel_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_following_channel account_following_channel_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_following_channel
    ADD CONSTRAINT account_following_channel_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_following_channel account_following_channel_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_following_channel
    ADD CONSTRAINT account_following_channel_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: account_following_playlist account_following_playlist_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_following_playlist
    ADD CONSTRAINT account_following_playlist_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_following_playlist account_following_playlist_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_following_playlist
    ADD CONSTRAINT account_following_playlist_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlist(id) ON DELETE CASCADE;


--
-- Name: account_google_play_purchase account_google_play_purchase_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_google_play_purchase
    ADD CONSTRAINT account_google_play_purchase_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_membership_status account_membership_status_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_membership_status
    ADD CONSTRAINT account_membership_status_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_membership_status account_membership_status_account_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_membership_status
    ADD CONSTRAINT account_membership_status_account_membership_id_fkey FOREIGN KEY (account_membership_id) REFERENCES public.account_membership(id);


--
-- Name: account_metaboost account_metaboost_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_metaboost
    ADD CONSTRAINT account_metaboost_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_notification_channel_type account_notification_channel__account_notification_channel_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_notification_channel_type
    ADD CONSTRAINT account_notification_channel__account_notification_channel_fkey FOREIGN KEY (account_notification_channel_id) REFERENCES public.account_notification_channel(id) ON DELETE CASCADE;


--
-- Name: account_notification_channel account_notification_channel_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_notification_channel
    ADD CONSTRAINT account_notification_channel_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_notification_channel account_notification_channel_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_notification_channel
    ADD CONSTRAINT account_notification_channel_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: account_paypal_order account_paypal_order_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_paypal_order
    ADD CONSTRAINT account_paypal_order_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_profile account_profile_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_profile
    ADD CONSTRAINT account_profile_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_reset_password account_reset_password_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_reset_password
    ADD CONSTRAINT account_reset_password_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_set_password account_set_password_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_set_password
    ADD CONSTRAINT account_set_password_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_settings account_settings_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings
    ADD CONSTRAINT account_settings_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_settings_locale account_settings_locale_account_settings_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings_locale
    ADD CONSTRAINT account_settings_locale_account_settings_id_fkey FOREIGN KEY (account_settings_id) REFERENCES public.account_settings(id) ON DELETE CASCADE;


--
-- Name: account_settings_notification account_settings_notification_account_settings_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings_notification
    ADD CONSTRAINT account_settings_notification_account_settings_id_fkey FOREIGN KEY (account_settings_id) REFERENCES public.account_settings(id) ON DELETE CASCADE;


--
-- Name: account_settings_notification_type account_settings_notification_account_settings_notificatio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_settings_notification_type
    ADD CONSTRAINT account_settings_notification_account_settings_notificatio_fkey FOREIGN KEY (account_settings_notification_id) REFERENCES public.account_settings_notification(id) ON DELETE CASCADE;


--
-- Name: account account_sharable_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_sharable_status_id_fkey FOREIGN KEY (sharable_status_id) REFERENCES public.sharable_status(id);


--
-- Name: account_up_device account_up_device_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_up_device
    ADD CONSTRAINT account_up_device_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_verification account_verification_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_verification
    ADD CONSTRAINT account_verification_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: account_webpush_device account_webpush_device_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_webpush_device
    ADD CONSTRAINT account_webpush_device_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: category category_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.category(id) ON DELETE CASCADE;


--
-- Name: channel_about channel_about_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_about
    ADD CONSTRAINT channel_about_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_about channel_about_itunes_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_about
    ADD CONSTRAINT channel_about_itunes_type_id_fkey FOREIGN KEY (itunes_type_id) REFERENCES public.channel_itunes_type(id);


--
-- Name: channel_category channel_category_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_category
    ADD CONSTRAINT channel_category_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(id) ON DELETE CASCADE;


--
-- Name: channel_category channel_category_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_category
    ADD CONSTRAINT channel_category_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_chat channel_chat_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_chat
    ADD CONSTRAINT channel_chat_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_description channel_description_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_description
    ADD CONSTRAINT channel_description_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel channel_feed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT channel_feed_id_fkey FOREIGN KEY (feed_id) REFERENCES public.feed(id) ON DELETE CASCADE;


--
-- Name: channel_funding channel_funding_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_funding
    ADD CONSTRAINT channel_funding_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_image channel_image_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_image
    ADD CONSTRAINT channel_image_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_internal_settings channel_internal_settings_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_internal_settings
    ADD CONSTRAINT channel_internal_settings_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_license channel_license_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_license
    ADD CONSTRAINT channel_license_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_location channel_location_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_location
    ADD CONSTRAINT channel_location_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel channel_medium_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT channel_medium_id_fkey FOREIGN KEY (medium_id) REFERENCES public.medium(id);


--
-- Name: channel_meta_boost channel_meta_boost_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_meta_boost
    ADD CONSTRAINT channel_meta_boost_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_person channel_person_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_person
    ADD CONSTRAINT channel_person_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_podroll channel_podroll_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_podroll
    ADD CONSTRAINT channel_podroll_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_podroll_remote_item channel_podroll_remote_item_channel_podroll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_podroll_remote_item
    ADD CONSTRAINT channel_podroll_remote_item_channel_podroll_id_fkey FOREIGN KEY (channel_podroll_id) REFERENCES public.channel_podroll(id) ON DELETE CASCADE;


--
-- Name: channel_podroll_remote_item channel_podroll_remote_item_medium_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_podroll_remote_item
    ADD CONSTRAINT channel_podroll_remote_item_medium_id_fkey FOREIGN KEY (medium_id) REFERENCES public.medium(id);


--
-- Name: channel_publisher channel_publisher_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_publisher
    ADD CONSTRAINT channel_publisher_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_publisher_remote_item channel_publisher_remote_item_channel_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_publisher_remote_item
    ADD CONSTRAINT channel_publisher_remote_item_channel_publisher_id_fkey FOREIGN KEY (channel_publisher_id) REFERENCES public.channel_publisher(id) ON DELETE CASCADE;


--
-- Name: channel_publisher_remote_item channel_publisher_remote_item_medium_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_publisher_remote_item
    ADD CONSTRAINT channel_publisher_remote_item_medium_id_fkey FOREIGN KEY (medium_id) REFERENCES public.medium(id);


--
-- Name: channel_remote_item channel_remote_item_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_remote_item
    ADD CONSTRAINT channel_remote_item_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_remote_item channel_remote_item_medium_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_remote_item
    ADD CONSTRAINT channel_remote_item_medium_id_fkey FOREIGN KEY (medium_id) REFERENCES public.medium(id);


--
-- Name: channel_season channel_season_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_season
    ADD CONSTRAINT channel_season_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_social_interact channel_social_interact_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_social_interact
    ADD CONSTRAINT channel_social_interact_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_trailer channel_trailer_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_trailer
    ADD CONSTRAINT channel_trailer_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_trailer channel_trailer_channel_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_trailer
    ADD CONSTRAINT channel_trailer_channel_season_id_fkey FOREIGN KEY (channel_season_id) REFERENCES public.channel_season(id);


--
-- Name: channel_txt channel_txt_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_txt
    ADD CONSTRAINT channel_txt_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_value channel_value_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_value
    ADD CONSTRAINT channel_value_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: channel_value_recipient channel_value_recipient_channel_value_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_value_recipient
    ADD CONSTRAINT channel_value_recipient_channel_value_id_fkey FOREIGN KEY (channel_value_id) REFERENCES public.channel_value(id) ON DELETE CASCADE;


--
-- Name: clip clip_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clip
    ADD CONSTRAINT clip_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: clip clip_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clip
    ADD CONSTRAINT clip_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: clip clip_sharable_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clip
    ADD CONSTRAINT clip_sharable_status_id_fkey FOREIGN KEY (sharable_status_id) REFERENCES public.sharable_status(id);


--
-- Name: feed feed_feed_flag_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed
    ADD CONSTRAINT feed_feed_flag_status_id_fkey FOREIGN KEY (feed_flag_status_id) REFERENCES public.feed_flag_status(id);


--
-- Name: feed feed_feed_flag_status_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed
    ADD CONSTRAINT feed_feed_flag_status_reason_id_fkey FOREIGN KEY (feed_flag_status_reason_id) REFERENCES public.feed_flag_status_reason(id);


--
-- Name: feed_log feed_log_feed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feed_log
    ADD CONSTRAINT feed_log_feed_id_fkey FOREIGN KEY (feed_id) REFERENCES public.feed(id) ON DELETE CASCADE;


--
-- Name: item_about item_about_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_about
    ADD CONSTRAINT item_about_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_about item_about_item_itunes_episode_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_about
    ADD CONSTRAINT item_about_item_itunes_episode_type_id_fkey FOREIGN KEY (item_itunes_episode_type_id) REFERENCES public.item_itunes_episode_type(id);


--
-- Name: item item_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: item_chapter item_chapter_item_chapters_object_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapter
    ADD CONSTRAINT item_chapter_item_chapters_object_id_fkey FOREIGN KEY (item_chapters_object_id) REFERENCES public.item_chapters_object(id) ON DELETE CASCADE;


--
-- Name: item_chapter_location item_chapter_location_item_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapter_location
    ADD CONSTRAINT item_chapter_location_item_chapter_id_fkey FOREIGN KEY (item_chapter_id) REFERENCES public.item_chapter(id) ON DELETE CASCADE;


--
-- Name: item_chapters_feed item_chapters_feed_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapters_feed
    ADD CONSTRAINT item_chapters_feed_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_chapters_feed_log item_chapters_feed_log_item_chapters_feed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapters_feed_log
    ADD CONSTRAINT item_chapters_feed_log_item_chapters_feed_id_fkey FOREIGN KEY (item_chapters_feed_id) REFERENCES public.item_chapters_feed(id) ON DELETE CASCADE;


--
-- Name: item_chapters_object item_chapters_object_item_chapters_feed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chapters_object
    ADD CONSTRAINT item_chapters_object_item_chapters_feed_id_fkey FOREIGN KEY (item_chapters_feed_id) REFERENCES public.item_chapters_feed(id) ON DELETE CASCADE;


--
-- Name: item_chat item_chat_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_chat
    ADD CONSTRAINT item_chat_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_content_link item_content_link_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_content_link
    ADD CONSTRAINT item_content_link_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_description item_description_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_description
    ADD CONSTRAINT item_description_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_enclosure_integrity item_enclosure_integrity_item_enclosure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_enclosure_integrity
    ADD CONSTRAINT item_enclosure_integrity_item_enclosure_id_fkey FOREIGN KEY (item_enclosure_id) REFERENCES public.item_enclosure(id) ON DELETE CASCADE;


--
-- Name: item_enclosure item_enclosure_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_enclosure
    ADD CONSTRAINT item_enclosure_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_enclosure_source item_enclosure_source_item_enclosure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_enclosure_source
    ADD CONSTRAINT item_enclosure_source_item_enclosure_id_fkey FOREIGN KEY (item_enclosure_id) REFERENCES public.item_enclosure(id) ON DELETE CASCADE;


--
-- Name: item_funding item_funding_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_funding
    ADD CONSTRAINT item_funding_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_image item_image_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_image
    ADD CONSTRAINT item_image_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item item_item_flag_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_item_flag_status_id_fkey FOREIGN KEY (item_flag_status_id) REFERENCES public.item_flag_status(id);


--
-- Name: item_license item_license_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_license
    ADD CONSTRAINT item_license_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_location item_location_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_location
    ADD CONSTRAINT item_location_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_person item_person_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_person
    ADD CONSTRAINT item_person_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_season item_season_channel_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_season
    ADD CONSTRAINT item_season_channel_season_id_fkey FOREIGN KEY (channel_season_id) REFERENCES public.channel_season(id) ON DELETE CASCADE;


--
-- Name: item_season_episode item_season_episode_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_season_episode
    ADD CONSTRAINT item_season_episode_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_season item_season_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_season
    ADD CONSTRAINT item_season_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_social_interact item_social_interact_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_social_interact
    ADD CONSTRAINT item_social_interact_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_soundbite item_soundbite_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_soundbite
    ADD CONSTRAINT item_soundbite_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_transcript item_transcript_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_transcript
    ADD CONSTRAINT item_transcript_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_txt item_txt_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_txt
    ADD CONSTRAINT item_txt_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_value item_value_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value
    ADD CONSTRAINT item_value_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: item_value_recipient item_value_recipient_item_value_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value_recipient
    ADD CONSTRAINT item_value_recipient_item_value_id_fkey FOREIGN KEY (item_value_id) REFERENCES public.item_value(id) ON DELETE CASCADE;


--
-- Name: item_value_time_split item_value_time_split_item_value_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value_time_split
    ADD CONSTRAINT item_value_time_split_item_value_id_fkey FOREIGN KEY (item_value_id) REFERENCES public.item_value(id) ON DELETE CASCADE;


--
-- Name: item_value_time_split_recipient item_value_time_split_recipient_item_value_time_split_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value_time_split_recipient
    ADD CONSTRAINT item_value_time_split_recipient_item_value_time_split_id_fkey FOREIGN KEY (item_value_time_split_id) REFERENCES public.item_value_time_split(id) ON DELETE CASCADE;


--
-- Name: item_value_time_split_remote_item item_value_time_split_remote_item_item_value_time_split_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_value_time_split_remote_item
    ADD CONSTRAINT item_value_time_split_remote_item_item_value_time_split_id_fkey FOREIGN KEY (item_value_time_split_id) REFERENCES public.item_value_time_split(id) ON DELETE CASCADE;


--
-- Name: live_item live_item_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_item
    ADD CONSTRAINT live_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: live_item live_item_live_item_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_item
    ADD CONSTRAINT live_item_live_item_status_id_fkey FOREIGN KEY (live_item_status_id) REFERENCES public.live_item_status(id);


--
-- Name: membership_claim_token membership_claim_token_account_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_claim_token
    ADD CONSTRAINT membership_claim_token_account_membership_id_fkey FOREIGN KEY (account_membership_id) REFERENCES public.account_membership(id) ON DELETE CASCADE;


--
-- Name: on_demand_parser_event on_demand_parser_event_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.on_demand_parser_event
    ADD CONSTRAINT on_demand_parser_event_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: playlist playlist_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist
    ADD CONSTRAINT playlist_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: playlist playlist_medium_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist
    ADD CONSTRAINT playlist_medium_id_fkey FOREIGN KEY (medium_id) REFERENCES public.medium(id);


--
-- Name: playlist_resource playlist_resource_clip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_resource
    ADD CONSTRAINT playlist_resource_clip_id_fkey FOREIGN KEY (clip_id) REFERENCES public.clip(id) ON DELETE CASCADE;


--
-- Name: playlist_resource playlist_resource_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_resource
    ADD CONSTRAINT playlist_resource_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: playlist_resource playlist_resource_item_soundbite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_resource
    ADD CONSTRAINT playlist_resource_item_soundbite_id_fkey FOREIGN KEY (item_soundbite_id) REFERENCES public.item_soundbite(id) ON DELETE CASCADE;


--
-- Name: playlist_resource playlist_resource_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_resource
    ADD CONSTRAINT playlist_resource_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlist(id) ON DELETE CASCADE;


--
-- Name: playlist playlist_sharable_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist
    ADD CONSTRAINT playlist_sharable_status_id_fkey FOREIGN KEY (sharable_status_id) REFERENCES public.sharable_status(id);


--
-- Name: queue queue_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: queue queue_medium_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_medium_id_fkey FOREIGN KEY (medium_id) REFERENCES public.medium(id);


--
-- Name: queue_resource queue_resource_clip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_resource
    ADD CONSTRAINT queue_resource_clip_id_fkey FOREIGN KEY (clip_id) REFERENCES public.clip(id) ON DELETE CASCADE;


--
-- Name: queue_resource queue_resource_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_resource
    ADD CONSTRAINT queue_resource_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: queue_resource queue_resource_item_soundbite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_resource
    ADD CONSTRAINT queue_resource_item_soundbite_id_fkey FOREIGN KEY (item_soundbite_id) REFERENCES public.item_soundbite(id) ON DELETE CASCADE;


--
-- Name: queue_resource queue_resource_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_resource
    ADD CONSTRAINT queue_resource_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.queue(id) ON DELETE CASCADE;


--
-- Name: stats_aggregated_account stats_aggregated_account_tracked_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_account
    ADD CONSTRAINT stats_aggregated_account_tracked_account_id_fkey FOREIGN KEY (tracked_account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: stats_aggregated_channel stats_aggregated_channel_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_channel
    ADD CONSTRAINT stats_aggregated_channel_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: stats_aggregated_clip stats_aggregated_clip_clip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_clip
    ADD CONSTRAINT stats_aggregated_clip_clip_id_fkey FOREIGN KEY (clip_id) REFERENCES public.clip(id) ON DELETE CASCADE;


--
-- Name: stats_aggregated_item stats_aggregated_item_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_item
    ADD CONSTRAINT stats_aggregated_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: stats_aggregated_playlist stats_aggregated_playlist_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_aggregated_playlist
    ADD CONSTRAINT stats_aggregated_playlist_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlist(id) ON DELETE CASCADE;


--
-- Name: stats_track_account_guid stats_track_account_guid_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_account_guid
    ADD CONSTRAINT stats_track_account_guid_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: stats_track_event_account stats_track_event_account_account_guid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_account
    ADD CONSTRAINT stats_track_event_account_account_guid_fkey FOREIGN KEY (account_guid) REFERENCES public.stats_track_account_guid(account_guid) ON DELETE CASCADE;


--
-- Name: stats_track_event_account stats_track_event_account_tracked_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_account
    ADD CONSTRAINT stats_track_event_account_tracked_account_id_fkey FOREIGN KEY (tracked_account_id) REFERENCES public.account(id) ON DELETE CASCADE;


--
-- Name: stats_track_event_channel stats_track_event_channel_account_guid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_channel
    ADD CONSTRAINT stats_track_event_channel_account_guid_fkey FOREIGN KEY (account_guid) REFERENCES public.stats_track_account_guid(account_guid) ON DELETE CASCADE;


--
-- Name: stats_track_event_channel stats_track_event_channel_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_channel
    ADD CONSTRAINT stats_track_event_channel_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- Name: stats_track_event_clip stats_track_event_clip_account_guid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_clip
    ADD CONSTRAINT stats_track_event_clip_account_guid_fkey FOREIGN KEY (account_guid) REFERENCES public.stats_track_account_guid(account_guid) ON DELETE CASCADE;


--
-- Name: stats_track_event_clip stats_track_event_clip_clip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_clip
    ADD CONSTRAINT stats_track_event_clip_clip_id_fkey FOREIGN KEY (clip_id) REFERENCES public.clip(id) ON DELETE CASCADE;


--
-- Name: stats_track_event_item stats_track_event_item_account_guid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_item
    ADD CONSTRAINT stats_track_event_item_account_guid_fkey FOREIGN KEY (account_guid) REFERENCES public.stats_track_account_guid(account_guid) ON DELETE CASCADE;


--
-- Name: stats_track_event_item stats_track_event_item_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_item
    ADD CONSTRAINT stats_track_event_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id) ON DELETE CASCADE;


--
-- Name: stats_track_event_playlist stats_track_event_playlist_account_guid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_playlist
    ADD CONSTRAINT stats_track_event_playlist_account_guid_fkey FOREIGN KEY (account_guid) REFERENCES public.stats_track_account_guid(account_guid) ON DELETE CASCADE;


--
-- Name: stats_track_event_playlist stats_track_event_playlist_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_track_event_playlist
    ADD CONSTRAINT stats_track_event_playlist_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlist(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO podverse_app_read;
GRANT USAGE ON SCHEMA public TO podverse_app_read_write;


--
-- Name: TABLE account; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account TO podverse_app_read_write;


--
-- Name: TABLE account_app_store_purchase; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_app_store_purchase TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_app_store_purchase TO podverse_app_read_write;


--
-- Name: TABLE account_credentials; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_credentials TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_credentials TO podverse_app_read_write;


--
-- Name: SEQUENCE account_credentials_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_credentials_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_credentials_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_email_change_verification; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_email_change_verification TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_email_change_verification TO podverse_app_read_write;


--
-- Name: SEQUENCE account_email_change_verification_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_email_change_verification_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_email_change_verification_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_fcm_device; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_fcm_device TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_fcm_device TO podverse_app_read_write;


--
-- Name: SEQUENCE account_fcm_device_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_fcm_device_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_fcm_device_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_following_account; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_following_account TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_following_account TO podverse_app_read_write;


--
-- Name: TABLE account_following_add_by_rss_channel; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_following_add_by_rss_channel TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_following_add_by_rss_channel TO podverse_app_read_write;


--
-- Name: TABLE account_following_channel; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_following_channel TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_following_channel TO podverse_app_read_write;


--
-- Name: TABLE account_following_playlist; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_following_playlist TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_following_playlist TO podverse_app_read_write;


--
-- Name: TABLE account_google_play_purchase; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_google_play_purchase TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_google_play_purchase TO podverse_app_read_write;


--
-- Name: SEQUENCE account_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_membership; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_membership TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_membership TO podverse_app_read_write;


--
-- Name: SEQUENCE account_membership_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_membership_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_membership_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_membership_status; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_membership_status TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_membership_status TO podverse_app_read_write;


--
-- Name: SEQUENCE account_membership_status_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_membership_status_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_membership_status_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_metaboost; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_metaboost TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_metaboost TO podverse_app_read_write;


--
-- Name: TABLE account_notification_channel; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_notification_channel TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_notification_channel TO podverse_app_read_write;


--
-- Name: SEQUENCE account_notification_channel_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_notification_channel_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_notification_channel_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_notification_channel_type; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_notification_channel_type TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_notification_channel_type TO podverse_app_read_write;


--
-- Name: SEQUENCE account_notification_channel_type_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_notification_channel_type_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_notification_channel_type_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_paypal_order; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_paypal_order TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_paypal_order TO podverse_app_read_write;


--
-- Name: TABLE account_profile; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_profile TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_profile TO podverse_app_read_write;


--
-- Name: SEQUENCE account_profile_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_profile_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_profile_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_reset_password; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_reset_password TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_reset_password TO podverse_app_read_write;


--
-- Name: SEQUENCE account_reset_password_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_reset_password_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_reset_password_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_set_password; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_set_password TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_set_password TO podverse_app_read_write;


--
-- Name: SEQUENCE account_set_password_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_set_password_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_set_password_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_settings; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_settings TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_settings TO podverse_app_read_write;


--
-- Name: SEQUENCE account_settings_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_settings_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_settings_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_settings_locale; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_settings_locale TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_settings_locale TO podverse_app_read_write;


--
-- Name: SEQUENCE account_settings_locale_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_settings_locale_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_settings_locale_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_settings_notification; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_settings_notification TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_settings_notification TO podverse_app_read_write;


--
-- Name: SEQUENCE account_settings_notification_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_settings_notification_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_settings_notification_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_settings_notification_type; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_settings_notification_type TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_settings_notification_type TO podverse_app_read_write;


--
-- Name: SEQUENCE account_settings_notification_type_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_settings_notification_type_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_settings_notification_type_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_up_device; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_up_device TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_up_device TO podverse_app_read_write;


--
-- Name: SEQUENCE account_up_device_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_up_device_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_up_device_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_verification; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_verification TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_verification TO podverse_app_read_write;


--
-- Name: SEQUENCE account_verification_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_verification_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_verification_id_seq TO podverse_app_read_write;


--
-- Name: TABLE account_webpush_device; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.account_webpush_device TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.account_webpush_device TO podverse_app_read_write;


--
-- Name: SEQUENCE account_webpush_device_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.account_webpush_device_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.account_webpush_device_id_seq TO podverse_app_read_write;


--
-- Name: TABLE category; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.category TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.category TO podverse_app_read_write;


--
-- Name: SEQUENCE category_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.category_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.category_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel TO podverse_app_read_write;


--
-- Name: TABLE channel_about; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_about TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_about TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_about_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_about_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_about_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_category; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_category TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_category TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_category_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_category_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_category_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_chat; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_chat TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_chat TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_chat_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_chat_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_chat_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_description; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_description TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_description TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_description_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_description_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_description_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_funding; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_funding TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_funding TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_funding_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_funding_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_funding_id_seq TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_image; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_image TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_image TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_image_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_image_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_image_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_internal_settings; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_internal_settings TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_internal_settings TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_internal_settings_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_internal_settings_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_internal_settings_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_itunes_type; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_itunes_type TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_itunes_type TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_itunes_type_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_itunes_type_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_itunes_type_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_license; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_license TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_license TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_license_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_license_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_license_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_location; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_location TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_location TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_location_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_location_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_location_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_meta_boost; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_meta_boost TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_meta_boost TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_meta_boost_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_meta_boost_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_meta_boost_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_person; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_person TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_person TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_person_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_person_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_person_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_podroll; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_podroll TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_podroll TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_podroll_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_podroll_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_podroll_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_podroll_remote_item; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_podroll_remote_item TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_podroll_remote_item TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_podroll_remote_item_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_podroll_remote_item_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_podroll_remote_item_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_publisher; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_publisher TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_publisher TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_publisher_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_publisher_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_publisher_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_publisher_remote_item; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_publisher_remote_item TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_publisher_remote_item TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_publisher_remote_item_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_publisher_remote_item_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_publisher_remote_item_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_remote_item; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_remote_item TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_remote_item TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_remote_item_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_remote_item_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_remote_item_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_season; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_season TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_season TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_season_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_season_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_season_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_social_interact; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_social_interact TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_social_interact TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_social_interact_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_social_interact_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_social_interact_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_trailer; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_trailer TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_trailer TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_trailer_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_trailer_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_trailer_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_txt; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_txt TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_txt TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_txt_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_txt_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_txt_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_value; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_value TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_value TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_value_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_value_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_value_id_seq TO podverse_app_read_write;


--
-- Name: TABLE channel_value_recipient; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.channel_value_recipient TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.channel_value_recipient TO podverse_app_read_write;


--
-- Name: SEQUENCE channel_value_recipient_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.channel_value_recipient_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.channel_value_recipient_id_seq TO podverse_app_read_write;


--
-- Name: TABLE clip; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.clip TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.clip TO podverse_app_read_write;


--
-- Name: SEQUENCE clip_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.clip_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.clip_id_seq TO podverse_app_read_write;


--
-- Name: TABLE feed; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.feed TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.feed TO podverse_app_read_write;


--
-- Name: TABLE feed_flag_status; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.feed_flag_status TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.feed_flag_status TO podverse_app_read_write;


--
-- Name: SEQUENCE feed_flag_status_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.feed_flag_status_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.feed_flag_status_id_seq TO podverse_app_read_write;


--
-- Name: TABLE feed_flag_status_reason; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.feed_flag_status_reason TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.feed_flag_status_reason TO podverse_app_read_write;


--
-- Name: SEQUENCE feed_flag_status_reason_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.feed_flag_status_reason_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.feed_flag_status_reason_id_seq TO podverse_app_read_write;


--
-- Name: SEQUENCE feed_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.feed_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.feed_id_seq TO podverse_app_read_write;


--
-- Name: TABLE feed_log; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.feed_log TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.feed_log TO podverse_app_read_write;


--
-- Name: SEQUENCE feed_log_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.feed_log_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.feed_log_id_seq TO podverse_app_read_write;


--
-- Name: TABLE image_shrink_source; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.image_shrink_source TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.image_shrink_source TO podverse_app_read_write;


--
-- Name: SEQUENCE image_shrink_source_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.image_shrink_source_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.image_shrink_source_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item TO podverse_app_read_write;


--
-- Name: TABLE item_about; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_about TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_about TO podverse_app_read_write;


--
-- Name: SEQUENCE item_about_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_about_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_about_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_chapter; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_chapter TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_chapter TO podverse_app_read_write;


--
-- Name: SEQUENCE item_chapter_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_chapter_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_chapter_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_chapter_location; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_chapter_location TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_chapter_location TO podverse_app_read_write;


--
-- Name: SEQUENCE item_chapter_location_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_chapter_location_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_chapter_location_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_chapters_feed; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_chapters_feed TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_chapters_feed TO podverse_app_read_write;


--
-- Name: SEQUENCE item_chapters_feed_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_chapters_feed_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_chapters_feed_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_chapters_feed_log; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_chapters_feed_log TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_chapters_feed_log TO podverse_app_read_write;


--
-- Name: SEQUENCE item_chapters_feed_log_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_chapters_feed_log_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_chapters_feed_log_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_chapters_object; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_chapters_object TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_chapters_object TO podverse_app_read_write;


--
-- Name: SEQUENCE item_chapters_object_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_chapters_object_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_chapters_object_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_chat; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_chat TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_chat TO podverse_app_read_write;


--
-- Name: SEQUENCE item_chat_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_chat_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_chat_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_content_link; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_content_link TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_content_link TO podverse_app_read_write;


--
-- Name: SEQUENCE item_content_link_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_content_link_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_content_link_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_description; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_description TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_description TO podverse_app_read_write;


--
-- Name: SEQUENCE item_description_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_description_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_description_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_enclosure; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_enclosure TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_enclosure TO podverse_app_read_write;


--
-- Name: SEQUENCE item_enclosure_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_enclosure_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_enclosure_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_enclosure_integrity; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_enclosure_integrity TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_enclosure_integrity TO podverse_app_read_write;


--
-- Name: SEQUENCE item_enclosure_integrity_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_enclosure_integrity_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_enclosure_integrity_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_enclosure_source; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_enclosure_source TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_enclosure_source TO podverse_app_read_write;


--
-- Name: SEQUENCE item_enclosure_source_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_enclosure_source_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_enclosure_source_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_flag_status; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_flag_status TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_flag_status TO podverse_app_read_write;


--
-- Name: SEQUENCE item_flag_status_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_flag_status_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_flag_status_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_funding; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_funding TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_funding TO podverse_app_read_write;


--
-- Name: SEQUENCE item_funding_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_funding_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_funding_id_seq TO podverse_app_read_write;


--
-- Name: SEQUENCE item_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_image; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_image TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_image TO podverse_app_read_write;


--
-- Name: SEQUENCE item_image_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_image_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_image_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_itunes_episode_type; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_itunes_episode_type TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_itunes_episode_type TO podverse_app_read_write;


--
-- Name: SEQUENCE item_itunes_episode_type_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_itunes_episode_type_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_itunes_episode_type_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_license; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_license TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_license TO podverse_app_read_write;


--
-- Name: SEQUENCE item_license_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_license_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_license_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_location; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_location TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_location TO podverse_app_read_write;


--
-- Name: SEQUENCE item_location_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_location_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_location_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_person; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_person TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_person TO podverse_app_read_write;


--
-- Name: SEQUENCE item_person_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_person_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_person_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_season; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_season TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_season TO podverse_app_read_write;


--
-- Name: TABLE item_season_episode; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_season_episode TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_season_episode TO podverse_app_read_write;


--
-- Name: SEQUENCE item_season_episode_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_season_episode_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_season_episode_id_seq TO podverse_app_read_write;


--
-- Name: SEQUENCE item_season_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_season_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_season_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_social_interact; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_social_interact TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_social_interact TO podverse_app_read_write;


--
-- Name: SEQUENCE item_social_interact_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_social_interact_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_social_interact_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_soundbite; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_soundbite TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_soundbite TO podverse_app_read_write;


--
-- Name: SEQUENCE item_soundbite_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_soundbite_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_soundbite_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_transcript; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_transcript TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_transcript TO podverse_app_read_write;


--
-- Name: SEQUENCE item_transcript_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_transcript_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_transcript_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_txt; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_txt TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_txt TO podverse_app_read_write;


--
-- Name: SEQUENCE item_txt_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_txt_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_txt_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_value; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_value TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_value TO podverse_app_read_write;


--
-- Name: SEQUENCE item_value_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_value_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_value_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_value_recipient; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_value_recipient TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_value_recipient TO podverse_app_read_write;


--
-- Name: SEQUENCE item_value_recipient_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_value_recipient_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_value_recipient_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_value_time_split; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_value_time_split TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_value_time_split TO podverse_app_read_write;


--
-- Name: SEQUENCE item_value_time_split_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_value_time_split_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_value_time_split_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_value_time_split_recipient; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_value_time_split_recipient TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_value_time_split_recipient TO podverse_app_read_write;


--
-- Name: SEQUENCE item_value_time_split_recipient_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_value_time_split_recipient_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_value_time_split_recipient_id_seq TO podverse_app_read_write;


--
-- Name: TABLE item_value_time_split_remote_item; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.item_value_time_split_remote_item TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.item_value_time_split_remote_item TO podverse_app_read_write;


--
-- Name: SEQUENCE item_value_time_split_remote_item_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.item_value_time_split_remote_item_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.item_value_time_split_remote_item_id_seq TO podverse_app_read_write;


--
-- Name: TABLE linear_migration_history; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.linear_migration_history TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.linear_migration_history TO podverse_app_read_write;


--
-- Name: SEQUENCE linear_migration_history_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.linear_migration_history_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.linear_migration_history_id_seq TO podverse_app_read_write;


--
-- Name: TABLE live_item; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.live_item TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.live_item TO podverse_app_read_write;


--
-- Name: SEQUENCE live_item_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.live_item_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.live_item_id_seq TO podverse_app_read_write;


--
-- Name: TABLE live_item_status; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.live_item_status TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.live_item_status TO podverse_app_read_write;


--
-- Name: SEQUENCE live_item_status_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.live_item_status_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.live_item_status_id_seq TO podverse_app_read_write;


--
-- Name: TABLE medium; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.medium TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.medium TO podverse_app_read_write;


--
-- Name: SEQUENCE medium_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.medium_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.medium_id_seq TO podverse_app_read_write;


--
-- Name: TABLE membership_claim_token; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.membership_claim_token TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.membership_claim_token TO podverse_app_read_write;


--
-- Name: TABLE on_demand_parser_event; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.on_demand_parser_event TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.on_demand_parser_event TO podverse_app_read_write;


--
-- Name: SEQUENCE on_demand_parser_event_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.on_demand_parser_event_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.on_demand_parser_event_id_seq TO podverse_app_read_write;


--
-- Name: TABLE playlist; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.playlist TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.playlist TO podverse_app_read_write;


--
-- Name: SEQUENCE playlist_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.playlist_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.playlist_id_seq TO podverse_app_read_write;


--
-- Name: TABLE playlist_resource; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.playlist_resource TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.playlist_resource TO podverse_app_read_write;


--
-- Name: SEQUENCE playlist_resource_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.playlist_resource_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.playlist_resource_id_seq TO podverse_app_read_write;


--
-- Name: TABLE queue; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.queue TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.queue TO podverse_app_read_write;


--
-- Name: SEQUENCE queue_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.queue_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.queue_id_seq TO podverse_app_read_write;


--
-- Name: TABLE queue_resource; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.queue_resource TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.queue_resource TO podverse_app_read_write;


--
-- Name: SEQUENCE queue_resource_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.queue_resource_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.queue_resource_id_seq TO podverse_app_read_write;


--
-- Name: TABLE sharable_status; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.sharable_status TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sharable_status TO podverse_app_read_write;


--
-- Name: SEQUENCE sharable_status_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.sharable_status_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.sharable_status_id_seq TO podverse_app_read_write;


--
-- Name: TABLE stats_aggregated_account; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.stats_aggregated_account TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_aggregated_account TO podverse_app_read_write;


--
-- Name: SEQUENCE stats_aggregated_account_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.stats_aggregated_account_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.stats_aggregated_account_id_seq TO podverse_app_read_write;


--
-- Name: TABLE stats_aggregated_channel; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.stats_aggregated_channel TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_aggregated_channel TO podverse_app_read_write;


--
-- Name: SEQUENCE stats_aggregated_channel_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.stats_aggregated_channel_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.stats_aggregated_channel_id_seq TO podverse_app_read_write;


--
-- Name: TABLE stats_aggregated_clip; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.stats_aggregated_clip TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_aggregated_clip TO podverse_app_read_write;


--
-- Name: SEQUENCE stats_aggregated_clip_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.stats_aggregated_clip_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.stats_aggregated_clip_id_seq TO podverse_app_read_write;


--
-- Name: TABLE stats_aggregated_item; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.stats_aggregated_item TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_aggregated_item TO podverse_app_read_write;


--
-- Name: SEQUENCE stats_aggregated_item_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.stats_aggregated_item_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.stats_aggregated_item_id_seq TO podverse_app_read_write;


--
-- Name: TABLE stats_aggregated_playlist; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.stats_aggregated_playlist TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_aggregated_playlist TO podverse_app_read_write;


--
-- Name: SEQUENCE stats_aggregated_playlist_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.stats_aggregated_playlist_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.stats_aggregated_playlist_id_seq TO podverse_app_read_write;


--
-- Name: TABLE stats_track_account_guid; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.stats_track_account_guid TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_track_account_guid TO podverse_app_read_write;


--
-- Name: SEQUENCE stats_track_account_guid_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.stats_track_account_guid_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.stats_track_account_guid_id_seq TO podverse_app_read_write;


--
-- Name: TABLE stats_track_event_account; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.stats_track_event_account TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_track_event_account TO podverse_app_read_write;


--
-- Name: SEQUENCE stats_track_event_account_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.stats_track_event_account_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.stats_track_event_account_id_seq TO podverse_app_read_write;


--
-- Name: TABLE stats_track_event_channel; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.stats_track_event_channel TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_track_event_channel TO podverse_app_read_write;


--
-- Name: SEQUENCE stats_track_event_channel_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.stats_track_event_channel_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.stats_track_event_channel_id_seq TO podverse_app_read_write;


--
-- Name: TABLE stats_track_event_clip; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.stats_track_event_clip TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_track_event_clip TO podverse_app_read_write;


--
-- Name: SEQUENCE stats_track_event_clip_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.stats_track_event_clip_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.stats_track_event_clip_id_seq TO podverse_app_read_write;


--
-- Name: TABLE stats_track_event_item; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.stats_track_event_item TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_track_event_item TO podverse_app_read_write;


--
-- Name: SEQUENCE stats_track_event_item_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.stats_track_event_item_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.stats_track_event_item_id_seq TO podverse_app_read_write;


--
-- Name: TABLE stats_track_event_playlist; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.stats_track_event_playlist TO podverse_app_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stats_track_event_playlist TO podverse_app_read_write;


--
-- Name: SEQUENCE stats_track_event_playlist_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.stats_track_event_playlist_id_seq TO podverse_app_read;
GRANT ALL ON SEQUENCE public.stats_track_event_playlist_id_seq TO podverse_app_read_write;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres_user_app IN SCHEMA public GRANT SELECT ON SEQUENCES TO podverse_app_read;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres_user_app IN SCHEMA public GRANT ALL ON SEQUENCES TO podverse_app_read_write;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres_user_app IN SCHEMA public GRANT SELECT ON TABLES TO podverse_app_read;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres_user_app IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO podverse_app_read_write;


--
-- PostgreSQL database dump complete
--



\connect podverse_management

--
-- PostgreSQL database dump
--


-- Dumped from database version 18.1 (Debian 18.1-1.pgdg13+2)
-- Dumped by pg_dump version 18.1 (Debian 18.1-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: nano_id_v2; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.nano_id_v2 AS character varying(15)
	CONSTRAINT nano_id_v2_len_check CHECK (((VALUE IS NULL) OR ((char_length((VALUE)::text) >= 9) AND (char_length((VALUE)::text) <= 15))));


--
-- Name: server_time_with_default; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.server_time_with_default AS timestamp without time zone DEFAULT now();


--
-- Name: varchar_email; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_email AS character varying(255)
	CONSTRAINT varchar_email_check CHECK (((VALUE)::text ~ '^.+@.+\..+$'::text));


--
-- Name: varchar_password; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.varchar_password AS character varying(60);


--
-- Name: set_updated_at_field(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_field() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


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
    email public.varchar_email NOT NULL,
    password public.varchar_password NOT NULL
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
    feed_flag_statuses_crud integer DEFAULT 0 NOT NULL,
    feed_flag_status_reasons_crud integer DEFAULT 0 CONSTRAINT admin_account_permissions_feed_flag_status_reasons_cru_not_null NOT NULL,
    admins_crud integer DEFAULT 0 NOT NULL,
    stats_crud integer DEFAULT 0 NOT NULL,
    created_at public.server_time_with_default,
    updated_at public.server_time_with_default,
    CONSTRAINT admin_account_permissions_admins_crud_check CHECK (((admins_crud >= 0) AND (admins_crud <= 15))),
    CONSTRAINT admin_account_permissions_feed_flag_status_reasons_crud_check CHECK (((feed_flag_status_reasons_crud >= 0) AND (feed_flag_status_reasons_crud <= 15))),
    CONSTRAINT admin_account_permissions_feed_flag_statuses_crud_check CHECK (((feed_flag_statuses_crud >= 0) AND (feed_flag_statuses_crud <= 15))),
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
-- Name: linear_migration_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.linear_migration_history (
    id integer NOT NULL,
    migration_filename character varying(255) NOT NULL,
    migration_checksum character varying(64) NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: linear_migration_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.linear_migration_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: linear_migration_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.linear_migration_history_id_seq OWNED BY public.linear_migration_history.id;


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
-- Name: database_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.database_audit_log ALTER COLUMN id SET DEFAULT nextval('public.database_audit_log_id_seq'::regclass);


--
-- Name: linear_migration_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linear_migration_history ALTER COLUMN id SET DEFAULT nextval('public.linear_migration_history_id_seq'::regclass);


--
-- Name: admin_account_credentials admin_account_credentials_admin_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_credentials
    ADD CONSTRAINT admin_account_credentials_admin_account_id_key UNIQUE (admin_account_id);


--
-- Name: admin_account_credentials admin_account_credentials_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_account_credentials
    ADD CONSTRAINT admin_account_credentials_email_key UNIQUE (email);


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
-- Name: database_audit_log database_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.database_audit_log
    ADD CONSTRAINT database_audit_log_pkey PRIMARY KEY (id);


--
-- Name: linear_migration_history linear_migration_history_migration_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linear_migration_history
    ADD CONSTRAINT linear_migration_history_migration_filename_key UNIQUE (migration_filename);


--
-- Name: linear_migration_history linear_migration_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linear_migration_history
    ADD CONSTRAINT linear_migration_history_pkey PRIMARY KEY (id);


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
-- Name: idx_linear_migration_history_applied_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linear_migration_history_applied_at ON public.linear_migration_history USING btree (applied_at DESC);


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
-- Name: database_audit_log database_audit_log_admin_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.database_audit_log
    ADD CONSTRAINT database_audit_log_admin_account_id_fkey FOREIGN KEY (admin_account_id) REFERENCES public.admin_account(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO podverse_management_read;
GRANT USAGE ON SCHEMA public TO podverse_management_read_write;


--
-- Name: TABLE admin_account; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.admin_account TO podverse_management_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admin_account TO podverse_management_read_write;


--
-- Name: TABLE admin_account_credentials; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.admin_account_credentials TO podverse_management_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admin_account_credentials TO podverse_management_read_write;


--
-- Name: SEQUENCE admin_account_credentials_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.admin_account_credentials_id_seq TO podverse_management_read;
GRANT ALL ON SEQUENCE public.admin_account_credentials_id_seq TO podverse_management_read_write;


--
-- Name: SEQUENCE admin_account_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.admin_account_id_seq TO podverse_management_read;
GRANT ALL ON SEQUENCE public.admin_account_id_seq TO podverse_management_read_write;


--
-- Name: TABLE admin_account_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.admin_account_permissions TO podverse_management_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admin_account_permissions TO podverse_management_read_write;


--
-- Name: SEQUENCE admin_account_permissions_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.admin_account_permissions_id_seq TO podverse_management_read;
GRANT ALL ON SEQUENCE public.admin_account_permissions_id_seq TO podverse_management_read_write;


--
-- Name: TABLE admin_account_role; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.admin_account_role TO podverse_management_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admin_account_role TO podverse_management_read_write;


--
-- Name: SEQUENCE admin_account_role_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.admin_account_role_id_seq TO podverse_management_read;
GRANT ALL ON SEQUENCE public.admin_account_role_id_seq TO podverse_management_read_write;


--
-- Name: TABLE database_audit_log; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.database_audit_log TO podverse_management_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.database_audit_log TO podverse_management_read_write;


--
-- Name: SEQUENCE database_audit_log_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.database_audit_log_id_seq TO podverse_management_read;
GRANT ALL ON SEQUENCE public.database_audit_log_id_seq TO podverse_management_read_write;


--
-- Name: TABLE linear_migration_history; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.linear_migration_history TO podverse_management_read;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.linear_migration_history TO podverse_management_read_write;


--
-- Name: SEQUENCE linear_migration_history_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON SEQUENCE public.linear_migration_history_id_seq TO podverse_management_read;
GRANT ALL ON SEQUENCE public.linear_migration_history_id_seq TO podverse_management_read_write;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres_user_management IN SCHEMA public GRANT SELECT ON SEQUENCES TO podverse_management_read;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres_user_management IN SCHEMA public GRANT ALL ON SEQUENCES TO podverse_management_read_write;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres_user_management IN SCHEMA public GRANT SELECT ON TABLES TO podverse_management_read;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres_user_management IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO podverse_management_read_write;


--
-- PostgreSQL database dump complete
--



