-- 0036 migration: operator-configured embed demo showcase slots (sparse rows)

CREATE TABLE embed_demo_showcase (
    showcase_id VARCHAR(64) PRIMARY KEY,
    resource_id_text VARCHAR(15) NOT NULL,
    created_at server_time_with_default,
    updated_at server_time_with_default
);
