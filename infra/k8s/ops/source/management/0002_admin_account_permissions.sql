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
