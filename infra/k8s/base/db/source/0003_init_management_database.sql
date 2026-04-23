-- Combined migrations generated Thu Apr 23 01:17:28 CDT 2026
-- DO NOT EDIT - regenerate with scripts/database/combine-migrations.sh

-- Including: 0000_init_helpers.sql
-- Connect to the management database explicitly before running migrations
\c podverse_management

-- 0000 migration

-- Extensions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helpers (matching main database patterns)

-- In the previous version of the app, short_id was 7-14 characters long.
-- To make migration to v2 easier, we will use a 15 character long short_id,
-- so we can easily distinguish between v1 and v2 short_ids.
CREATE DOMAIN nano_id_v2 AS VARCHAR(15);

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


-- Including: 0001_init_admin_accounts.sql
-- 0001 migration

-- Admin Account Role Lookup Table (created before admin_account since it's referenced)
CREATE TABLE admin_account_role (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL UNIQUE CHECK (role IN ('superuser', 'admin')),
    created_at server_time_with_default,
    updated_at server_time_with_default
);

CREATE TRIGGER set_updated_at_admin_account_role
BEFORE UPDATE ON admin_account_role
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_field();

-- Seed the 2 roles
INSERT INTO admin_account_role (id, role) VALUES (1, 'superuser');
INSERT INTO admin_account_role (id, role) VALUES (2, 'admin');

-- Admin Account Table
CREATE TABLE admin_account (
    id SERIAL PRIMARY KEY,
    id_text nano_id_v2 UNIQUE NOT NULL,
    admin_account_role_id INTEGER NOT NULL DEFAULT 2 REFERENCES admin_account_role(id),
    created_at server_time_with_default,
    updated_at server_time_with_default
);

CREATE INDEX idx_admin_account_admin_account_role_id ON admin_account(admin_account_role_id);

CREATE TRIGGER set_updated_at_admin_account
BEFORE UPDATE ON admin_account
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_field();

-- Admin Account Credentials Table
CREATE TABLE admin_account_credentials (
    id SERIAL PRIMARY KEY,
    admin_account_id INTEGER NOT NULL REFERENCES admin_account(id) ON DELETE CASCADE UNIQUE,
    email varchar_email UNIQUE NOT NULL,
    password varchar_password NOT NULL
);

CREATE INDEX idx_admin_account_credentials_admin_account_id ON admin_account_credentials(admin_account_id);


-- Including: 0002_admin_account_permissions.sql
-- 0002 migration

-- CRUD bitmask: create=1, read=2, update=4, delete=8. Value 0-15.
-- 0 = no access, 15 = full CRUD.

-- Admin Account Permissions Table
CREATE TABLE admin_account_permissions (
    id SERIAL PRIMARY KEY,
    admin_account_id INTEGER NOT NULL REFERENCES admin_account(id) ON DELETE CASCADE UNIQUE,
    feeds_crud INTEGER NOT NULL DEFAULT 0 CHECK (feeds_crud BETWEEN 0 AND 15),
    feed_flag_statuses_crud INTEGER NOT NULL DEFAULT 0 CHECK (feed_flag_statuses_crud BETWEEN 0 AND 15),
    feed_flag_status_reasons_crud INTEGER NOT NULL DEFAULT 0 CHECK (feed_flag_status_reasons_crud BETWEEN 0 AND 15),
    admins_crud INTEGER NOT NULL DEFAULT 0 CHECK (admins_crud BETWEEN 0 AND 15),
    stats_crud INTEGER NOT NULL DEFAULT 0 CHECK (stats_crud BETWEEN 0 AND 15),
    created_at server_time_with_default,
    updated_at server_time_with_default
);

CREATE INDEX idx_admin_account_permissions_admin_account_id ON admin_account_permissions(admin_account_id);

CREATE TRIGGER set_updated_at_admin_account_permissions
BEFORE UPDATE ON admin_account_permissions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_field();

-- Grant the superuser (id=1) full permissions on all resources
INSERT INTO admin_account_permissions (admin_account_id, feeds_crud, feed_flag_statuses_crud, feed_flag_status_reasons_crud, admins_crud, stats_crud)
SELECT id, 15, 15, 15, 15, 15
FROM admin_account
WHERE admin_account_role_id = 1;


-- Including: 0003_database_audit_log.sql
-- 0003 migration

CREATE TABLE database_audit_log (
    id BIGSERIAL PRIMARY KEY,
    admin_account_id INTEGER NOT NULL REFERENCES admin_account(id),
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    table_name VARCHAR(100) NOT NULL,
    row_id INTEGER NOT NULL,
    before_snapshot JSONB,
    after_snapshot JSONB,
    request_id VARCHAR(64),
    created_at server_time_with_default
);

CREATE INDEX idx_database_audit_log_admin_account_id ON database_audit_log(admin_account_id);
CREATE INDEX idx_database_audit_log_table_name_row_id ON database_audit_log(table_name, row_id);
CREATE INDEX idx_database_audit_log_created_at ON database_audit_log(created_at);


