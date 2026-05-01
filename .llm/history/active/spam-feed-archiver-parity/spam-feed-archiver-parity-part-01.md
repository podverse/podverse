### Session 1 - 2026-05-01

#### Prompt (Developer)

Add Spam Hard-Delete Parity In Archiver

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Created feature history file before code edits per repo tracking rules.
- Replaced takedown-only feed item purge with a shared hard-delete path for `Spam` and `Takedown`.
- Kept feed-row retention behavior unchanged so statuses remain durable parse-block references.
- Added a focused `ArchiverService` unit test file using mocked repositories to verify hard-delete parity.
- Updated lifecycle docs to reflect the new archiver method and spam+takedown behavior.

#### Files Modified

- .llm/history/active/spam-feed-archiver-parity/spam-feed-archiver-parity-part-01.md
- packages/orm/src/services/archiver.ts
- packages/orm/src/services/archiver.test.ts
- docs/RSS-ARCHIVE-DELETE-LIFECYCLE.md

### Session 3 - 2026-05-01

#### Prompt (Developer)

Add SpamPermitted And Adjust Spam Archival

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added `SpamPermitted` as a new feed status enum/id and introduced app migration `0018_spam_permit.sql`.
- Updated parse eligibility so `SpamPermitted` feeds can parse and use a 100,000 spam threshold (10,000 remains default for other parse-eligible statuses).
- Reverted spam archiver hard-delete behavior so only `Takedown` stays on the hard-delete + optional channel-row cleanup path.
- Updated lifecycle docs and operational status references to match the new status and archive policy.

#### Files Modified

- .llm/history/active/spam-feed-archiver-parity/spam-feed-archiver-parity-part-01.md
- infra/k8s/base/ops/source/database/linear-migrations/app/0018_spam_permit.sql
- infra/k8s/base/ops/kustomization.yaml
- infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz
- infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql
- packages/orm/src/entities/feed/feedFlagStatus.ts
- packages/orm/src/services/feed/feedFlagStatus.ts
- packages/parser/src/lib/rss/parser.ts
- packages/orm/src/services/archiver.ts
- packages/orm/src/services/feed/feedFlagStatus.test.ts
- packages/orm/src/services/archiver.test.ts
- docs/RSS-ARCHIVE-DELETE-LIFECYCLE.md
- infra/pipelines/jenkins/alpha/Jenkinsfile.aux_workers_orm_feed_update_flag_status

### Session 2 - 2026-05-01

#### Prompt (Developer)

as part of the "spam" and "takedown" archival process, it should remove ALL items for those feeds, and it also should remove all optional rows in channel related tables. we just want to retain the minimum info basically for the system to remember what the feed was for (including a readable title) that was marked as spam or takedown.

#### Key Decisions

- Blocked-feed cleanup now hard-deletes all item rows for `Spam` and `Takedown` feeds.
- Added optional channel-row cleanup for blocked feeds to reduce retained data while preserving feed/channel identity and readable title.
- Implemented channel cleanup with explicit SQL deletes for optional `channel_*` tables and nested remote/recipient rows.
- Updated docs to define retained minimum reference and blocked-feed cleanup behavior.

#### Files Modified

- .llm/history/active/spam-feed-archiver-parity/spam-feed-archiver-parity-part-01.md
- packages/orm/src/services/archiver.ts
- packages/orm/src/services/archiver.test.ts
- docs/RSS-ARCHIVE-DELETE-LIFECYCLE.md

### Session 4 - 2026-05-01

#### Prompt (Developer)

instead of adding 0019 just update the existing insert in 0018 (no alter). implement plan

#### Key Decisions

- Updated existing `0018_spam_permit.sql` only: CHECK list and INSERT use DB token `spam-permitted` (no separate 0019 migration).
- Extended `checkIfSpamFeed` with explicit thresholds plus exported `DEFAULT_SPAM_FEED_ITEM_THRESHOLDS`; workers resolve overrides from `PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT` / `PARSER_SPAM_FEED_ITEM_THRESHOLD_SPAM_PERMITTED` into parser config (API paths without `parser` settings keep ORM defaults).
- Refreshed linear baseline gz and `0004_seed_linear_migration_history.sql` checksum for the edited migration file.

#### Files Modified

- .llm/history/active/spam-feed-archiver-parity/spam-feed-archiver-parity-part-01.md
- infra/k8s/base/ops/source/database/linear-migrations/app/0018_spam_permit.sql
- infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz
- infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz
- infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql
- packages/orm/src/services/feed/feedFlagStatus.ts
- packages/orm/src/services/feed/feedFlagStatus.test.ts
- packages/parser/src/config/types.ts
- packages/parser/src/lib/rss/parser.ts
- packages/helpers-config/src/configValidation.ts
- apps/workers/src/index.ts
- apps/workers/src/lib/startup/validation.ts
- apps/workers/.env.example
- apps/workers/ENV.md
- infra/k8s/base/workers/source/workers.env
- docs/RSS-ARCHIVE-DELETE-LIFECYCLE.md

### Session 5 - 2026-05-01

#### Prompt (Developer)

Spam feed item cleanup (parity with pending-archive retention)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added `getSpamFeedsWithActiveOrPendingItems()` (distinct spam feeds joined to items in `Active` / `PendingArchive`) so stable spam feeds with only archived or empty channels are skipped.
- Added `processSpamFeeds()` mirroring pending-archive feed item handling via `processItems` without mutating feed status or `last_parsed_file_hash`.
- Inserted `processSpamFeeds()` into `archiveAll()` after `processPendingArchiveFeeds()` and before `processPendingArchiveItems()`.
- Extended `archiver.test.ts` with QueryBuilder mocks and spam cleanup / ordering coverage.
- Updated lifecycle + flaws docs for spam archiver parity.

#### Files Modified

- packages/orm/src/services/archiver.ts
- packages/orm/src/services/archiver.test.ts
- docs/RSS-ARCHIVE-DELETE-LIFECYCLE.md
- docs/RSS-ARCHIVE-DELETE-FLAWS-AND-RECOMMENDATIONS.md
- .llm/history/active/spam-feed-archiver-parity/spam-feed-archiver-parity-part-01.md
