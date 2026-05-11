-- 0009 migration: custom management-admin role templates (predefined roles remain in application code)

CREATE TABLE management_admin_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    feeds_crud INTEGER NOT NULL CHECK (feeds_crud >= 0 AND feeds_crud <= 15),
    feed_takedown_reasons_crud INTEGER NOT NULL CHECK (
        feed_takedown_reasons_crud >= 0 AND feed_takedown_reasons_crud <= 15
    ),
    admins_crud INTEGER NOT NULL CHECK (admins_crud >= 0 AND admins_crud <= 15),
    stats_crud INTEGER NOT NULL CHECK (stats_crud >= 0 AND stats_crud <= 15),
    billing_prices_crud INTEGER NOT NULL CHECK (billing_prices_crud >= 0 AND billing_prices_crud <= 15),
    bucket_crud INTEGER NOT NULL CHECK (bucket_crud >= 0 AND bucket_crud <= 15),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
