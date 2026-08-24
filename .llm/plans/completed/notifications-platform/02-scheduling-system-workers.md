# 02 — Scheduling system (workers)

**Cursor model:** Codex 5.3
**Reasoning:** high
**Ship bar:** Generic job runner command + K8s CronJob + membership-expiry job type + daily purge
(expired notifications + terminal scheduled jobs) + membership-change hooks. No admin UI.

## Goal

Poll `scheduled_job` for due work, execute handlers with claim/lock/backoff/dedupe, schedule
membership-expiry reminders 7 days before `membership_expires_at`, and cancel/replace stale jobs when
membership changes.

## Context (read first)

- Phase 01: `ScheduledJobService`, `scheduled_job` table
- Worker dispatch: `apps/workers/src/index.ts`, registry `packages/worker-commands/src/registry.ts`
- Billing cron precedent: `apps/workers/src/commands/billing/processDueRenewals.ts`,
  `infra/k8s/base/cron/worker-billing-renewals.cronjob.yaml`
- Membership extension points (hook cancel/reschedule):
  - `packages/orm/src/services/account/accountPayPalOrder.ts`
  - `packages/orm/src/services/billingRenewalOrchestrator.ts`
  - `packages/orm/src/services/membershipClaimToken.ts`
  - `packages/orm/src/services/account/account.ts` (signup trial)
- Skills: **workers**, **k8s**

## Worker command: `scheduledJobsRunDue`

Add to `apps/workers` + `worker-commands` registry:

1. **Claim batch** — `ScheduledJobService.claimDueBatch({ limit: 50, workerId })` sets
   `status=running`, `locked_at=now`, `locked_by`.
2. **Dispatch** by `job_type` to registered handler.
3. **On success** — `markCompleted`.
4. **On failure** — increment `attempts`; if `< max_attempts`, `requeueWithBackoff` (exponential,
   e.g. 5m × 2^attempts); else `markFailed`.
5. **Stale lock recovery** — jobs `running` with `locked_at` older than 15m reset to `pending`
   (optional safety in same command).

**Options:** `-limit N` (default 50), `-dry-run` (log only).

Category: ORM (+ notifications if handler sends push in later phase — keep ORM-only for expiry
reminder creation in this phase).

## Job type: `membership-expiry-reminder`

**Schedule:** When membership is set/extended, upsert job:

```text
dedupe_key: membership-expiry:account:{account_id}
run_after: membership_expires_at - 7 days
payload: { accountId, expiresAt }
```

If `run_after` is already in the past, run on next poll (immediate).

**Handler:**

1. Load account + `account_membership_status`.
2. **Stale guard:** If `hasValidMembership` is false OR `membership_expires_at` changed vs payload,
   `markCancelled` and exit (user renewed early).
3. Create `account_notification` row (category `membership-expiry`, title/body i18n keys in payload
   or pre-rendered en-US for v1 — prefer storing i18n keys + interpolation vars in `payload`).
4. `link_path`: `/membership/renew` (web); mobile deep link `more/membership` or shared path.
5. If user pref `push_enabled` for category + valid membership + devices: enqueue push via helper
   stub or defer full push to phase 04 (document: minimum = in-app row in 02; push in 04).

**Cancel/replace hooks** — add `MembershipExpiryReminderScheduler` service used from:

- PayPal complete / renewal orchestrator success
- Claim token extend
- Account signup (schedule first reminder)
- Any `accountMembershipStatusService.update` that changes `membership_expires_at`

On change: `cancelByDedupeKey` then `upsertByDedupeKey` with new `run_after`. If new expiry < 7d
away, set `run_after = now()`.

## Job type: `admin-notification-send` (stub)

Register handler that reads `payload.campaignId` — full implementation in phase 05. In 02, register
type string + no-op or throw "not implemented" guarded by tests; OR minimal implementation that
calls a placeholder service interface defined in 01.

Prefer: **interface only in 02**, handler body completed in 05.

## Retention / purge cron

Separate daily command (do not mix with the 5m job runner): `notificationsPlatformPurge` (or
`notificationsPurgeExpired` if renaming is undesirable — either way, one command handles both tables).

**Cutoff:** `now - 1 month` (same retention window as in-app notifications).

1. **Notifications** — `AccountNotificationService.deleteExpiredBefore(cutoff)` deletes rows where
   `expires_at < cutoff`.
2. **Scheduled jobs** — `ScheduledJobService.deleteTerminalBefore(cutoff)` deletes rows where
   `status` in (`completed`, `cancelled`, `failed`) and `updated_at < cutoff`. Never touch
   `pending` or `running`.

Log deleted counts per table. Idempotent; safe to run daily.

**K8s CronJob:** daily `0 4 * * *` → `notificationsPlatformPurge` (or piggyback on existing
maintenance cron only if that command already exists and can be extended cleanly).

## K8s

- `infra/k8s/base/cron/worker-scheduled-jobs.cronjob.yaml` — `*/5 * * * *` →
  `scheduledJobsRunDue`
- `infra/k8s/base/cron/worker-notifications-purge.cronjob.yaml` — daily purge (notifications +
  terminal jobs)
- Add to `infra/k8s/base/cron/kustomization.yaml`

## Unit tests

- Claim/backoff/dedupe logic (ScheduledJobService — may exist from 01).
- `deleteTerminalBefore`: removes old terminal rows; preserves `pending`/`running`.
- Purge command: calls both delete helpers; returns counts.
- Membership scheduler: given expiry T, `run_after` = T - 7d; reschedule on extend cancels old.
- Stale guard: payload expiry mismatch → cancelled, no notification row.

## Tasks

1. Implement `scheduledJobsRunDue` command + registry entry.
2. Implement `MembershipExpiryReminderScheduler` + handler.
3. Wire hooks into membership mutation services.
4. Add `ScheduledJobService.deleteTerminalBefore` (if missing from 01) + purge command + CronJob.
5. Add K8s CronJob manifest for job runner.
6. Unit tests.

## Out of scope

- Admin campaign send (05).
- Parser new-content rows (04).
- API endpoints (03).

## Acceptance

- CronJob manifest valid; command runs locally against test DB with seeded job.
- Extending membership replaces dedupe job; old reminder not fired.
- Expired notifications and terminal scheduled jobs older than 1 month purged by daily command.

## Verification (operator)

```bash
npm run build -w apps/workers
npm run test -w apps/workers
npm run test -w packages/orm
```

Optional manual: insert pending job with `run_after = now()`, run command, verify completed.
