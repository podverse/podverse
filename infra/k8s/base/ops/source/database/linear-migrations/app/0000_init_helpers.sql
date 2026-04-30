-- 0000 migration

-- Helpers

-- In the previous version of the app, short_id was 7-14 characters long.
-- To make migration to v2 easier, we will use a 15 character long short_id,
-- so we can easily distinguish between v1 and v2 short_ids.
-- id_text values: 9–15 characters; enforced in app code (`NANO_ID_V2_*`) and in DB (domain CHECK).
-- Create domain, or add CHECK on databases that had an older 0000 without the constraint.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nano_id_v2') THEN
    CREATE DOMAIN nano_id_v2 AS VARCHAR(15)
      CONSTRAINT nano_id_v2_len_check
      CHECK (VALUE IS NULL OR (char_length(VALUE) >= 9 AND char_length(VALUE) <= 15));
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_type t ON t.oid = c.contypid
    WHERE t.typname = 'nano_id_v2'
      AND c.conname = 'nano_id_v2_len_check'
  ) THEN
    ALTER DOMAIN nano_id_v2 ADD CONSTRAINT nano_id_v2_len_check
      CHECK (VALUE IS NULL OR (char_length(VALUE) >= 9 AND char_length(VALUE) <= 15));
  END IF;
END $$;

CREATE DOMAIN varchar_short AS VARCHAR(50);
CREATE DOMAIN varchar_normal AS VARCHAR(255);
CREATE DOMAIN varchar_long AS VARCHAR(2500);
CREATE DOMAIN varchar_longer AS VARCHAR(10000);

CREATE DOMAIN varchar_email AS VARCHAR(255) CHECK (VALUE ~ '^.+@.+\..+$');
CREATE DOMAIN varchar_fcm_token AS VARCHAR(255);
CREATE DOMAIN varchar_fqdn AS VARCHAR(253);
CREATE DOMAIN varchar_guid AS VARCHAR(36);
CREATE DOMAIN varchar_locale AS VARCHAR(85);
CREATE DOMAIN varchar_md5 AS VARCHAR(32);
-- bcrypt salted hash passwords are always 60 characters long
CREATE DOMAIN varchar_password AS VARCHAR(60);
CREATE DOMAIN varchar_slug AS VARCHAR(100);
CREATE DOMAIN varchar_uri AS VARCHAR(2083);
CREATE DOMAIN varchar_url AS VARCHAR(2083) CHECK (VALUE ~ '^https?://|^http?://');

CREATE DOMAIN server_time AS TIMESTAMP;
CREATE DOMAIN server_time_with_default AS TIMESTAMP DEFAULT NOW();

CREATE DOMAIN media_player_time AS NUMERIC(10, 2);
CREATE DOMAIN list_position AS NUMERIC(22, 21);
CREATE DOMAIN numeric_20_11 AS NUMERIC(20, 11);

-- Function to set updated_at
CREATE OR REPLACE FUNCTION set_updated_at_field()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
