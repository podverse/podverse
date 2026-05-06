-- 0005 migration
-- Adds CRUD permission surface for billing price management endpoints.

ALTER TABLE admin_account_permissions
ADD COLUMN billing_prices_crud INTEGER NOT NULL DEFAULT 0;
