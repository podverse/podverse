-- 0030 migration
-- Singleton trial-length settings row (merged with env bootstrap and billing catalog at runtime).

CREATE TABLE product_membership_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    free_trial_expiration_seconds INTEGER NOT NULL CHECK (free_trial_expiration_seconds > 0),
    created_at server_time_with_default,
    updated_at server_time_with_default
);
