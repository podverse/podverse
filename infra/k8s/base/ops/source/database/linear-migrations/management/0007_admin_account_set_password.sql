-- 0007 migration: set-password tokens for management admin accounts (invite / reset)

CREATE TABLE admin_account_set_password (
    id SERIAL PRIMARY KEY,
    admin_account_id INTEGER NOT NULL REFERENCES admin_account(id) ON DELETE CASCADE UNIQUE,
    set_password_token VARCHAR(36) NOT NULL,
    set_password_token_expires_at TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX idx_admin_account_set_password_token ON admin_account_set_password(set_password_token);
