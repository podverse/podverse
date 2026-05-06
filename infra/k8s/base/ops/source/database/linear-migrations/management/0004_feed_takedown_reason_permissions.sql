-- 0004 migration
-- Consolidate feed_flag_statuses_crud + feed_flag_status_reasons_crud into feed_takedown_reasons_crud.

ALTER TABLE admin_account_permissions
  ADD COLUMN feed_takedown_reasons_crud INTEGER NOT NULL DEFAULT 0
  CHECK (feed_takedown_reasons_crud BETWEEN 0 AND 15);

UPDATE admin_account_permissions
SET feed_takedown_reasons_crud = GREATEST(feed_flag_statuses_crud, feed_flag_status_reasons_crud);

ALTER TABLE admin_account_permissions DROP COLUMN feed_flag_statuses_crud;
ALTER TABLE admin_account_permissions DROP COLUMN feed_flag_status_reasons_crud;
