-- 0000 migration

-- Helpers (matching main database patterns)

-- In the previous version of the app, short_id was 7-14 characters long.
-- To make migration to v2 easier, we will use a 15 character long short_id,
-- so we can easily distinguish between v1 and v2 short_ids.
-- id_text (admin_account): 9–15 characters; enforced in app code and DB (domain CHECK).
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

CREATE DOMAIN varchar_email AS VARCHAR(255) CHECK (VALUE ~ '^.+@.+\..+$');
-- bcrypt salted hash passwords are always 60 characters long
CREATE DOMAIN varchar_password AS VARCHAR(60);
CREATE DOMAIN server_time_with_default AS TIMESTAMP DEFAULT NOW();

-- Function to set updated_at
CREATE OR REPLACE FUNCTION set_updated_at_field()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
