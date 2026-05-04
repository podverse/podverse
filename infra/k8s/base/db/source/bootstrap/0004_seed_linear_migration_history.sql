-- GENERATED FILE (do not edit) — see scripts/database/generate-linear-migration-history-seed.sh
-- Seeds linear_migration_history so forward-only ops jobs match baseline-materialized schema.

\connect podverse_app

-- App database
INSERT INTO linear_migration_history (migration_filename, migration_checksum) VALUES
  ('0000_init_helpers.sql', '0190dcea5501d0fbd29594d3bfb27ff3ad88043ed00e98f4860e8e91359436d5'),
  ('0001_init_podcasting_20_database.sql', '03f93166aac91b1cb11b84fc8cf331fbc97899d01373a61cf0d878493e78c0b0'),
  ('0002_account.sql', '121520493633102c0872ec2083acaf4aaf1b2ee8c7e2e46b3fdb058d0becc711'),
  ('0003_clip.sql', 'dc5b641eda345402a976939a4056b3676c21895069fba3ed4c2d1cd3812cdb72'),
  ('0004_playlist.sql', 'c67084cdcd79f41479b3b2c6c0d5804845072bcbdcee31bbe2f6069e716af6b6'),
  ('0005_queue.sql', 'c81169740c9bceaa861b2ff5d2cde022f6efb1b0c925dfabffebc8e1d1be8deb'),
  ('0006_account_following_tables.sql', '07a498a27bfa741177880ff7a1cf2ab47a3356566a0e328687961123b6fd7c47'),
  ('0007_notifications.sql', '7b8aae1a7e8cc65b907c32c506824c29de5ca39e00081801bd9400fc427cec3c'),
  ('0008_purchases_paypal_apple_google.sql', '77b9d403142330d4efdddd6b2f57c6b544bcd774b9fd4fa6a8fedbbc3b01701f'),
  ('0009_membership_claim_token.sql', '1021a382f37d9600041773fc80bfb3cdae97065fb5d81cc5340cf07bac485162'),
  ('0010_stats.sql', '521ad5f8f52a60f323c0bdfebbcde077f70023bcb0404f0609b71db0d78d0754'),
  ('0011_on_demand_parser_event.sql', '1e85708f7d44a66e06c5d4cf4028d6596a5cd41e58a0bd38bf1dcbd72955ca3c'),
  ('0012_account_settings.sql', 'f3491e414e8918391c20f98f5b25f4cdb694c1339ef321cd8a567563d4c23ba2'),
  ('0013_add_by_rss_basic_auth.sql', '1271f2e1d6b3c4f4c97ef6ae0beeb348f5750838aee8272e47330ee24f1b5afe'),
  ('0014_image_shrink_source.sql', 'de044e7f998b0c0bff95ecfa8efacad4320cfd1d356e365ab1bcfa61e7348c6e'),
  ('0015_metaboost.sql', '3d4233223bb796c5caa56f54818d651ffd7a19bc3edfdea68e429764cd4238b9'),
  ('0016_account_metaboost.sql', '253185148d8d807ff6a2abee7cadd2ed3092404179c2394783e8667ecde3eee3'),
  ('0017_feed_flag_status_reason.sql', '00da000f368b29ed63db1783f9eff8f4b19f3a77c6d8e5143283baf0271819af'),
  ('0018_spam_permit.sql', 'd85374c214f472b322cd3e3a1f8ff304a1c18787ed44e7b9c20c992dc49b2e4a'),
  ('0019_feed_spam_item_limit_override.sql', 'd83d9e96d931e2015bf77ca972d6dd550bf884194466024fb5f0faadf52980a5'),
  ('0020_image_shrink_last_deep_checked_at.sql', '31a5b3af1e8c3132eb6705e2f90ef1c24251a3e898170603dd9bbd6800add966')
ON CONFLICT (migration_filename) DO NOTHING;

\connect podverse_management

-- Management database
INSERT INTO linear_migration_history (migration_filename, migration_checksum) VALUES
  ('0000_init_helpers.sql', 'a063b654376ad4fe8ed72b25639d9484fbbb7d18d4945efbbd17d8e9f4e20e59'),
  ('0001_init_admin_accounts.sql', '2fa889c0997c511688a3ef59e95faf8f9ae8c82094663607e3c158bbb2ea2c49'),
  ('0002_admin_account_permissions.sql', '4a4b47174ebd5461806e7cc5283380211de6330ab50d8fe838ddacc622dd8ba8'),
  ('0003_database_audit_log.sql', '11463218c192200aa91ce78003dfda58f730eba9b87e63c2d1bd3ca36a8e90ea')
ON CONFLICT (migration_filename) DO NOTHING;

