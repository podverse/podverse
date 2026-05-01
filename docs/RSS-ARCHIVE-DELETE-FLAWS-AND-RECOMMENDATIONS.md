# RSS Archive/Delete Flaws And Recommendations

This document captures observed gaps in the current RSS archive/delete lifecycle and recommends
separate remediation work. It is based on implemented behavior in source, not intended behavior.

## Quick Summary

- Current item retention checks only consider `Clip` and `PlaylistResource`.
- Queue-linked items can still be hard-deleted if they have no clip/playlist relationship.
- Takedown cleanup bypasses normal retention checks and bulk-deletes channel items.
- Dead-feeds merge automation is currently suspended.
- One item lifecycle status (`PendingDelete`) appears defined but inactive.

For baseline lifecycle behavior, see `docs/RSS-ARCHIVE-DELETE-LIFECYCLE.md`.

### Lifecycle follow-up (implemented)

- **Archived items without clip/playlists**: each `archiveAll` runs `deleteArchivedItemsWithoutClipOrPlaylist()` so `Archived` rows are hard-deleted once users remove the last `Clip` and `playlist_resource` ties (see lifecycle doc step 4).
- **Spam feed items**: `processSpamFeeds()` targets only **Spam** feeds that still have `Active` / `PendingArchive` items and applies the same `processItems` clip/playlist retention; the feed stays **Spam** (lifecycle doc step 2).

## Confirmed Gaps

### 1) Queue linkage is not an explicit archiver retention guard

Observed behavior:

- `processItems(...)` in archiver checks only `hasPlaylistResource` and `hasClip`.
- If both are false, item is deleted.
- `QueueResource` has `onDelete: 'CASCADE'` to `Item`, so queue rows are removed when item is deleted.

Related implementation (separate from retention): `archiveAll` and `QueueResourceService` no longer let non-`Active` `item` rows (or their clip/soundbite indirection) appear in user queue lists. That addresses stale UI and exports; it does **not** add queue as a keep condition inside `processItems` (see Option A in this document).

Sources:

- `packages/orm/src/services/archiver.ts`
- `packages/orm/src/entities/queue/queueResource.ts`
- `packages/orm/src/services/queue/queueResourceActiveItemFilter.ts`
- `packages/orm/src/services/queue/queueResource.ts`

### 2) Takedown flow bypasses clip/playlist retention logic

Observed behavior:

- `removeAllItemsForTakedownFeeds()` bulk deletes channel item ids.
- This does not call the per-item `processItems(...)` guard path.

Sources:

- `packages/orm/src/services/archiver.ts`

### 3) `PendingDelete` appears underused/inactive in runtime flow

Observed behavior:

- Enum includes `PendingDelete`.
- No active writer usage found in app code paths that process archive/delete.

Sources:

- `packages/orm/src/entities/item/itemFlagStatus.ts`
- `packages/helpers/src/dtos/item/itemFlagStatus.ts`

### 4) Dead-feed merge CronJob is suspended

Observed behavior:

- CronJob has `suspend: true` and an inline TODO that it is currently broken.

Sources:

- `infra/k8s/base/cron/worker-dead-feeds-merge.cronjob.yaml`
- `apps/workers/src/commands/podcastIndex/deadFeeds/flagAndMerge.ts`

### 5) Archiver has explicit TODOs for incomplete lifecycle handling

Observed behavior:

- TODO for re-checking archived items that no longer have dependencies.
- Spam feeds with leftover `Active` / `PendingArchive` items: addressed by `processSpamFeeds()` (same `processItems` rules as pending-archive feed handling; feed remains `Spam`).

Source:

- `packages/orm/src/services/archiver.ts`

## Risk Assessment

| Gap                                      | Severity | Primary Risk Type                  | Why It Matters                                                                  |
| ---------------------------------------- | -------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| Queue is not a retention guard           | High     | User data loss / UX surprise       | Queue-only saved episodes can disappear after archive processing.               |
| Takedown bypasses retention guard        | High     | User content continuity            | Item deletion can cascade to dependent rows regardless of clip/playlist intent. |
| Dead-feeds merge suspended               | Medium   | Operational drift                  | Duplicate/dead feed cleanup flow is not running automatically.                  |
| `PendingDelete` not lifecycle-integrated | Medium   | Model ambiguity / maintenance risk | Status exists but operational semantics are unclear.                            |
| Archiver TODOs unresolved                | Low-Med  | Lifecycle inconsistency            | Signals known logic gaps and potential stale archived records.                  |

## Remediation Options And Trade-Offs

### Option A: Extend retention guard to queue dependencies

Proposed change:

- In `ArchiverService.processItems(...)`, add a `QueueResource` existence check similar to clip/playlist.
- If queue linkage exists, set item to `Archived` instead of deleting.

Trade-offs:

- Pros: aligns behavior with user expectations for queued items.
- Cons: may increase retained archived item count.

Primary files:

- `packages/orm/src/services/archiver.ts`
- `packages/orm/src/entities/queue/queueResource.ts`

### Option B: Introduce two-step delete using `PendingDelete`

Proposed change:

- Convert hard-delete path to first set `PendingDelete`.
- Add a second pass/job that deletes only after explicit dependency recheck window.

Trade-offs:

- Pros: safer lifecycle and easier auditability.
- Cons: more state management and scheduler complexity.

Primary files:

- `packages/orm/src/entities/item/itemFlagStatus.ts`
- `packages/orm/src/services/archiver.ts`
- `apps/workers/src/commands/archiver/archiveAll.ts`

### Option C: Split takedown behavior into policy-controlled modes

Proposed change:

- Keep current strict legal mode as default.
- Add explicit alternate mode (if needed) for pre-delete dependency handling and reporting.

Trade-offs:

- Pros: clear legal/compliance intent and explicit behavior.
- Cons: more operational policy surface; risk if mode selection is misconfigured.

Primary files:

- `packages/orm/src/services/archiver.ts`
- `infra/k8s/base/cron/worker-archive-all.cronjob.yaml`

### Option D: Re-enable dead-feed merge safely

Proposed change:

- Fix failure mode in `podcastIndexDeadFeedsFlagAndMerge`.
- Re-enable CronJob with guardrails (timeouts, checkpoint logs, runbook).

Trade-offs:

- Pros: restores dedup/archive pipeline coverage.
- Cons: job may still be heavy and operationally noisy without incremental tuning.

Primary files:

- `infra/k8s/base/cron/worker-dead-feeds-merge.cronjob.yaml`
- `apps/workers/src/commands/podcastIndex/deadFeeds/flagAndMerge.ts`

## Suggested Verification And Regression Tests

## 1) Queue retention scenarios

- Create item with queue-only dependency.
- Move item into archive path.
- Assert expected retained/deleted outcome matches new policy.

Likely test locations:

- `packages/orm/src/services` unit tests
- `apps/api/src/test` integration tests where queue/item behavior is exercised

## 2) Takedown semantics

- Feed with takedown status and mixed item dependencies (clip/playlist/queue).
- Assert explicit expected policy behavior for each dependency type.

Likely test locations:

- `packages/orm/src/services` tests for `ArchiverService`

## 3) `PendingDelete` lifecycle (if adopted)

- Assert transition `PendingArchive -> PendingDelete -> delete`.
- Assert final delete only occurs after recheck and guard conditions.

Likely test locations:

- `packages/orm/src/services/archiver` tests
- worker command integration tests for `archiveAll`

## 4) Dead-feed merge operational test

- Validate duplicate feed merge rewiring (clips/playlists) and resulting feed status updates.
- Validate CronJob run can complete with checkpoint/restart behavior.

Likely test locations:

- `packages/orm/src/services/deduplicator` tests
- workers command tests around dead-feed merge flow

## Prioritization Recommendation

1. Queue retention guard (highest user-impact risk).
2. Takedown policy clarification and tests.
3. Dead-feed merge restoration.
4. `PendingDelete` formalization or removal.
5. Archiver TODO resolution for consistency cleanup.
