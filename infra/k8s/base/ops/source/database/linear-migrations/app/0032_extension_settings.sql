-- 0032_extension_settings.sql
-- Extension settings for the conditional extensions framework.
-- See docs/proposals/EXTENSIONS.md.

CREATE TABLE extension_settings (
  id varchar(120) PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by_admin_id integer NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX extension_settings_updated_at_idx ON extension_settings (updated_at);
