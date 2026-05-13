-- 0008 migration: optional email and username on admin credentials (at least one required)

ALTER TABLE admin_account_credentials ADD COLUMN username VARCHAR(64);

ALTER TABLE admin_account_credentials ALTER COLUMN email DROP NOT NULL;

ALTER TABLE admin_account_credentials ADD CONSTRAINT admin_account_credentials_email_or_username_check
  CHECK (email IS NOT NULL OR username IS NOT NULL);

ALTER TABLE admin_account_credentials ADD CONSTRAINT admin_account_credentials_username_length_check
  CHECK (username IS NULL OR (char_length(username) >= 1 AND char_length(username) <= 64));

ALTER TABLE admin_account_credentials DROP CONSTRAINT admin_account_credentials_email_key;

CREATE UNIQUE INDEX uq_admin_account_credentials_email ON admin_account_credentials (email) WHERE email IS NOT NULL;

CREATE UNIQUE INDEX uq_admin_account_credentials_username_lower ON admin_account_credentials (lower(username))
WHERE username IS NOT NULL;
