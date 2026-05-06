# History — Feed Status Table Replacement

## Metadata

- **Started**: 2026-05-05
- **Author**: Cursor Agent
- **Context**: Schema + data migration for lifecycle state (plan 01).

### Session 1 - 2026-05-05

#### Prompt (Developer)

Execute `.llm/plans/active/feed-status-table-replacement/01-schema-and-data-migration.md`
exactly as written. Ensure all prior behavior is preserved with lifecycle + condition/policy
structures.

#### Key Decisions

- Added `feed_lifecycle_state_type`, `feed_lifecycle_state`, `feed_lifecycle_event`, indexes,
  backfill from legacy `feed_flag_status_id`, and `AFTER INSERT` trigger so new feeds always get a
  lifecycle row (same mapping as 01b).
- `0026` adds `spam_permitted` condition + clears `primary_block_reason` for SpamPermitted legacy
  feeds; partial indexes for policy/conditions.
- `Feed` entity uses scalar legacy FK columns + `feed_lifecycle_state` OneToOne; removed ORM
  relations to lookup entities (`FeedFlagStatus` / `FeedFlagStatusReason`).
- Synced `infra/k8s/base/ops/kustomization.yaml` migration bundle (0024–0026).

#### Files Created/Modified

- `infra/k8s/base/ops/source/database/linear-migrations/app/0025_feed_lifecycle_state_replacement.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0026_feed_status_table_removal_prep.sql`
- `infra/k8s/base/ops/kustomization.yaml`
- `packages/orm/src/entities/feed/feed.ts`
- `packages/orm/src/entities/feed/feedConditionType.ts`
- `packages/orm/src/entities/feed/feedFlagStatus.ts`
- `packages/orm/src/entities/feed/feedFlagStatusReason.ts`
- `packages/orm/src/entities/feed/feedLifecycleEvent.ts`
- `packages/orm/src/entities/feed/feedLifecycleState.ts`
- `packages/orm/src/entities/feed/feedLifecycleStateType.ts`
- `packages/orm/src/entities/feed/feedLifecycleUpdateSource.ts`
- `packages/orm/src/db/entities.ts`
- `packages/orm/src/index.ts`
- `packages/orm/src/services/archiver.ts`
- `packages/orm/src/services/archiver.test.ts`
- `packages/orm/src/services/feed/feed.ts`
- `packages/orm/src/services/feed/feed.test.ts`
- `packages/parser/src/lib/rss/parser.ts`
- `packages/parser/src/lib/rss/parser.noopLockLoser.test.ts`
- `.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md`
- `.llm/plans/completed/feed-status-table-replacement/01-schema-and-data-migration.md`

### Session 2 - 2026-05-05

#### Prompt (Developer)

Execute `.llm/plans/active/feed-status-table-replacement/01b-status-mapping-and-transition-spec.md`
exactly as written. Lock mappings and transition rules before coding runtime behavior.

#### Key Decisions

- Canonical mapping lives in `packages/orm/src/lib/feedLegacyStatusToModelMapping.ts` (references
  completed plan **01b**); SQL header **`0025`** points at the same module.
- Transition matrix enforced in `packages/orm/src/lib/feedLifecycleTransitionValidation.ts` with
  **`FeedLifecycleTransitionService`** as the single call site for callers; escape hatches:
  **`operatorUntakedown`**, **`explicitManagementOverride`** per spec.
- **`FeedPolicyService`** file documents linkage to the mapping module for policy recompute parity.

#### Files Created/Modified

- `packages/orm/src/lib/feedLegacyStatusToModelMapping.ts`
- `packages/orm/src/lib/feedLegacyStatusToModelMapping.test.ts`
- `packages/orm/src/lib/feedLifecycleTransitionValidation.ts`
- `packages/orm/src/lib/feedLifecycleTransitionValidation.test.ts`
- `packages/orm/src/services/feed/feedLifecycleTransitionService.ts`
- `packages/orm/src/services/feed/feedLifecycleTransitionService.test.ts`
- `packages/orm/src/services/feed/feedPolicy.ts`
- `packages/orm/src/index.ts`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0025_feed_lifecycle_state_replacement.sql`
- `infra/k8s/base/ops/source/database/linear-migrations/app/0026_feed_status_table_removal_prep.sql`
- `.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md`
- `.llm/plans/completed/feed-status-table-replacement/01b-status-mapping-and-transition-spec.md`

### Session 3 - 2026-05-05

#### Prompt (Developer)

@podverse/.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md:18-19

#### Key Decisions

- Replaced `FeedService.updateFlagStatus` with `applyFeedModerationChanges`, `setFeedConditions`,
  `setFeedLifecycleState`, `refreshFeedPolicy`, and `applyLegacyModerationFromStatusIds` (CLI/worker
  parity); new `FeedLifecycleStateService` + `AppDataSourceReadWrite.transaction` on the DB proxy.
- `feed_flag_status` ORM enum column uses `LegacyFeedFlagStatusId`; slimmed `feedFlagStatus.ts` to
  `FeedFlagStatusReasonService` only; spam helpers consolidated under `lib/feedSpamThresholds.ts`.
- Parser gates on `shouldAttemptFeedParseFromLifecycleAndPolicy` + `checkIfSpamFeed` with active
  condition keys; deduplicator/worker CLI call legacy moderation API.

#### Files Created/Modified

- `packages/orm/src/db/index.ts`
- `packages/orm/src/entities/feed/feedFlagStatus.ts`
- `packages/orm/src/lib/feedLegacyStatusToModelMapping.ts`
- `packages/orm/src/lib/feedLifecycleState.ts`
- `packages/orm/src/lib/feedLifecycleState.test.ts`
- `packages/orm/src/lib/feedSpamThresholds.test.ts`
- `packages/orm/src/lib/syncLegacyFeedFlagColumns.ts`
- `packages/orm/src/index.ts`
- `packages/orm/src/services/feed/feed.ts`
- `packages/orm/src/services/feed/feed.test.ts`
- `packages/orm/src/services/feed/feedFlagStatus.ts`
- `packages/orm/src/services/feed/feedFlagStatus.test.ts`
- `packages/orm/src/services/feed/feedLifecycleState.ts`
- `packages/orm/src/services/archiver.test.ts`
- `packages/parser/src/lib/rss/parser.ts`
- `packages/parser/src/lib/rss/parser.noopLockLoser.test.ts`
- `apps/workers/src/commands/orm/feed/updateFlagStatus.ts`
- `apps/workers/src/lib/deduplicator.ts`
- `.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md`
- `.llm/plans/completed/feed-status-table-replacement/02-orm-and-domain-services.md`

### Session 4 - 2026-05-05

#### Prompt (Developer)

@podverse/.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md:23-24

#### Key Decisions

- Parser clears **`SpamDetected`** path via **`feedService.refreshFeedPolicy`** (policy + legacy sync),
  matching spam detection and oversized HTTP error handling.
- **`parser.parseRSSFeedAndSaveToDatabase.conditions.test.ts`**: lifecycle/policy gate blocks lock
  acquisition; oversized **`maxbodylength`** path sets **`oversized_detected`** without activating spam.
- **`getAndParseRSSFeed`** test covers oversized body vs **`maxFeedBodyBytes`**; noop lock-loser mock
  feed uses **`feed_lifecycle_state`** instead of legacy status id.

#### Files Created/Modified

- `packages/parser/src/lib/rss/parser.ts`
- `packages/parser/src/lib/rss/parser.getAndParseRSSFeed.test.ts`
- `packages/parser/src/lib/rss/parser.parseRSSFeedAndSaveToDatabase.conditions.test.ts`
- `packages/parser/src/lib/rss/parser.noopLockLoser.test.ts`
- `.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md`
- `.llm/plans/completed/feed-status-table-replacement/03-parser-pipeline-migration.md`

### Session 5 - 2026-05-05

#### Prompt (Developer)

@podverse/.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md:28-29

#### Key Decisions

- **`ArchiverService`** selects pending archive / takedown / spam cleanup via **`feed_lifecycle_state`**
  **`state_key`** and spam **`feed_condition`** keys (`SpamDetected` without `SpamPermitted`); pending
  archive completion calls **`FeedService.setFeedLifecycleState(Archived)`** + **`feedService.update`**
  for hash reset (no **`feed_flag_status_id`** writes).
- **`archiver.test.ts`**: takedown query expectation + **`FeedService`** mock; ESLint import sort on
  **`archiver.ts`**.
- **`deduplicator`**: channel archive path uses **`setFeedLifecycleState(PendingArchive)`** +
  **`FeedLifecycleUpdateSourceEnum.System`** instead of legacy status ids.
- **`updateFlagStatus`** CLI: usage/help references legacy numeric ids and **`applyLegacyModerationFromStatusIds`**.

#### Files Created/Modified

- `packages/orm/src/services/archiver.ts`
- `packages/orm/src/services/archiver.test.ts`
- `apps/workers/src/lib/deduplicator.ts`
- `apps/workers/src/commands/orm/feed/updateFlagStatus.ts`
- `.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md`
- `.llm/plans/completed/feed-status-table-replacement/04-archiver-lifecycle-migration.md`

### Session 6 - 2026-05-05

#### Prompt (Developer)

@podverse/.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md:33-34

#### Key Decisions

- **`feedFlagStatusAppDb`**: lookups join **`feed_lifecycle_state`**, **`feed_policy`**, **`feed_policy_override`**,
  and aggregate **`active_condition_keys`**; **`updateFeedOperationsPolicyState`** applies lifecycle transitions
  (management override), condition upserts, policy recompute + lifecycle guards, legacy **`feed_flag_status_*`**
  sync via **`deriveLegacyFeedFlagStatusId`**.
- **API**: **`GET /feed-operations/options`** returns **`lifecycle_states`**, **`condition_types`**,
  **`takedown_reasons`**; **`POST /feed-operations/update-policy-state`** replaces **`/flag-status`** with Joi
  matching **05b** (optional **`policy_overrides`**, takedown documentation validation).
- **ORM**: exported **`deriveLegacyFeedFlagStatusId`**, **`computeEffectivePolicyFromConditionKeys`**,
  **`applyLifecycleConstraintsToEffectiveFlags`** for shared policy math.
- **Management-web**: lifecycle select + condition checkboxes + takedown reason / notes; **`feedOperationsRequireConfirm`**.
- **i18n**: **`en-US`**, **`es`**, **`fr`**, **`el-GR`** feedFlagStatus keys updated.

#### Files Created/Modified

- `packages/orm/src/services/feed/feedPolicy.ts`
- `packages/orm/src/index.ts`
- `apps/management-api/src/lib/feed/feedFlagStatusAppDb.ts`
- `apps/management-api/src/routes/feedFlagStatus.ts`
- `apps/management-api/src/routes/feedFlagStatus.integration.test.ts`
- `apps/management-api/src/routes/workerCommands.integration.test.ts`
- `apps/management-web/src/lib/requests/feedFlagStatus.ts`
- `apps/management-web/src/lib/managementPermissions.ts`
- `apps/management-web/src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx`
- `apps/management-web/src/app/(management)/feed-operations/flag-status/page.module.scss`
- `apps/management-web/i18n/originals/en-US.json`
- `apps/management-web/i18n/originals/es.json`
- `apps/management-web/i18n/originals/fr.json`
- `apps/management-web/i18n/originals/el-GR.json`
- `apps/management-web/e2e/feed-operations-flag-status.spec.ts`
- `.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md`
- `.llm/plans/completed/feed-status-table-replacement/05-management-feed-ops-contract-migration.md`

### Session 7 - 2026-05-05

#### Prompt (Developer)

@podverse/.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md:38-39

#### Key Decisions

- **Frozen Joi contract** in `apps/management-api/src/schemas/feedOperationsPolicy.ts` (references **05b**),
  imported by **`feedFlagStatus`** routes; **`takedown_transitional`** optional boolean added per **05b**
  transitional-takedown rule.
- **`feedFlagStatusAppDb.updateFeedOperationsPolicyState`**: when transitioning to takedown without
  **`active_condition_keys`**, merges DB keys and appends **`takedown_active`** unless transitional; rejects
  illegal takedown-without-**`takedown_active`** when lifecycle/conditions were touched (maps to **400** in route).
- **`feedOperationsEnums`**: maps validated strings to **`FeedLifecycleStateKeyEnum`** /
  **`FeedConditionTypeKeyEnum`** without type assertions on request bodies.
- **Integration tests**: unknown lifecycle/condition keys **400**, response feed key set, **`takedown_transitional`**
  forwarded, audit **`adminAccountId`** + **`requestId`** with **`X-Request-Id`**.
- **Management-web** `ApplyFeedOperationsPolicyStateBody`: **`takedown_transitional?: boolean`** aligned with API.

#### Files Created/Modified

- `apps/management-api/src/schemas/feedOperationsPolicy.ts`
- `apps/management-api/src/lib/feed/feedOperationsEnums.ts`
- `apps/management-api/src/lib/feed/feedFlagStatusAppDb.ts`
- `apps/management-api/src/routes/feedFlagStatus.ts`
- `apps/management-api/src/routes/feedFlagStatus.integration.test.ts`
- `apps/management-web/src/lib/requests/feedFlagStatus.ts`
- `.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md`
- `.llm/plans/completed/feed-status-table-replacement/05b-management-api-contract-lock.md`

### Session 9 - 2026-05-05

#### Prompt (Developer)

@podverse/.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md:43-44

#### Key Decisions

- **`feedPolicyReason` helpers**: canonical **`FEED_POLICY_PRIMARY_BLOCK_REASON_KEYS`**, **`DTOFeedPolicy.primary_block_reason`**
  typed as **`FeedPolicyPrimaryBlockReasonKey | null`**, **`primaryBlockReasonForUi`** maps unknown non-empty API strings to
  **`unknown`** (never render raw keys).
- **`DTOFeed`**: optional **`feed_lifecycle_state`** (+ nested **`state_key`**); **`feed_flag_status`** optional (API may omit).
- **Podcast Index feed page**: **`primaryBlockReasonForUi`** on SSR; **`PodcastIndexFeedClient`** uses **`features.add_feed`**
  translations for banner + per-reason labels + mailto (adapted **`podcast_index_blocked-reason_i18n`** plan).
- **`takedownNoticeFromFeed`**: **`shouldRedirectFromTakedownNoticePage`** + **`resolveLegalNoticeTranslationKeys`** replace
  **`feed_flag_status.id`** branching; driven by lifecycle **`state_key`** and **`feed_policy`** (still uses existing **`legal.*`** keys).
- **i18n**: **`en-US`**, **`es`**, **`fr`**, **`el-GR`** originals + overrides stubs for new **`features.add_feed`** keys.

#### Files Created/Modified

- `packages/helpers/src/dtos/feed/feedPolicyReason.ts`
- `packages/helpers/src/dtos/feed/feedPolicyReason.test.ts`
- `packages/helpers/src/dtos/feed/feedPolicy.ts`
- `packages/helpers/src/dtos/feed/feed.ts`
- `packages/helpers/src/dtos/index.ts`
- `apps/web/src/lib/feed/takedownNoticeFromFeed.ts`
- `apps/web/src/app/podcast-index/feed/[podcast_index_id]/page.tsx`
- `apps/web/src/app/podcast-index/feed/[podcast_index_id]/PodcastIndexFeedClient.tsx`
- `apps/web/src/app/takedown-notice/[podcast_index_id]/TakedownNoticeClient.tsx`
- `apps/web/i18n/originals/en-US.json`
- `apps/web/i18n/originals/es.json`
- `apps/web/i18n/originals/fr.json`
- `apps/web/i18n/originals/el-GR.json`
- `apps/web/i18n/overrides/es.json`
- `apps/web/i18n/overrides/fr.json`
- `apps/web/i18n/overrides/el-GR.json`
- `.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md`
- `.llm/plans/completed/feed-status-table-replacement/06-web-blocked-reason-and-takedown-i18n.md`

### Session 10 - 2026-05-05

#### Prompt (Developer)

@podverse/.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md:48-49

#### Key Decisions

- **Pure policy module** `packages/orm/src/lib/feedEffectivePolicyComputed.ts`: extracted condition→policy +
  lifecycle guards from **`FeedPolicyService`** so parity tests avoid loading **`AppDataSource`** (Vitest entity
  metadata errors).
- **Lifecycle**: **`pending_archive`** included with archived/takedown in **`applyLifecycleConstraintsTo*`** (01b parity).
- **Parity tests**: **`feedEffectivePolicyComputed.test.ts`** covers fixtures **1–10** with strict assertions;
  **`feedLifecycleTransitionValidation.test.ts`** + **`feedFlagStatus.integration.test.ts`** cover **#11** (HTTP 400) and
  **#12** (unknown condition key).
- **Traceability**: completed **`07b-parity-fixture-matrix.md`** maps scenarios → tests; parser conditions test file header
  references **07b**.

#### Files Created/Modified

- `packages/orm/src/lib/feedEffectivePolicyComputed.ts`
- `packages/orm/src/lib/feedEffectivePolicyComputed.test.ts`
- `packages/orm/src/services/feed/feedPolicy.ts`
- `apps/management-api/src/routes/feedFlagStatus.integration.test.ts`
- `packages/parser/src/lib/rss/parser.parseRSSFeedAndSaveToDatabase.conditions.test.ts`
- `.llm/plans/active/feed-status-table-replacement/COPY-PASTA.md`
- `.llm/plans/completed/feed-status-table-replacement/07b-parity-fixture-matrix.md`
