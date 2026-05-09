-- 0008 migration
-- Adds CRUD permission surface for extension management endpoints.

ALTER TABLE admin_account_permissions
  ADD COLUMN extensions_crud INTEGER NOT NULL DEFAULT 0
  CHECK (extensions_crud BETWEEN 0 AND 15);
