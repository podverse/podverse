-- 0010 migration: CRUD permission surface for embed demo configuration endpoints.

ALTER TABLE admin_account_permissions
ADD COLUMN embed_demo_crud INTEGER NOT NULL DEFAULT 0;

ALTER TABLE management_admin_role
ADD COLUMN embed_demo_crud INTEGER NOT NULL DEFAULT 0 CHECK (embed_demo_crud >= 0 AND embed_demo_crud <= 15);
