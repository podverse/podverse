-- 0006 migration
-- CRUD permission for object storage browser in management.

ALTER TABLE admin_account_permissions
  ADD COLUMN bucket_crud INTEGER NOT NULL DEFAULT 0
  CHECK (bucket_crud BETWEEN 0 AND 15);
