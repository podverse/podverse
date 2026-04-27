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
