# 05 — Sync event log

**Cursor model:** Opus 5
**Reasoning:** high
**Detail:** [719-sync-event-log](/docs/proposals/mobile/_master-plan_/phase-2/details/719-sync-event-log.md)
**Master step:** P2.4.10
**Depends on:** 03

Read [`mobile-sync-orchestration`](/.cursor/rules/mobile-sync-orchestration.mdc) before starting.

## Goal

Sync failures are quiet on screen but not invisible: a capped on-device log, reachable from More,
that a user can hand to support.

## Work

1. Add a capped table under `apps/mobile/src/data/db/` holding `occurred_at`, `job_kind`, `outcome`,
   `error_code`, and `message`. Cap at **500** entries, oldest evicted first.
2. Attach a persistent sink to the failure listener seam the queue exposes from prompt 03. Do not
   change the queue's behavior — a failure still skips the job and lets the run continue.
3. **Store the machine-readable error code.** The message is localized, so the code is the only part
   a user can usefully quote. Extract it with `getErrorResponseStatus` and
   `getErrorResponseBodyCode` from `@podverse/helpers/error` rather than re-deriving. An entry with a
   translated sentence and no code is not diagnosable.
4. Protect failures from eviction. If successes are stored at all, they must not push the only
   failure out of the 500 — a log that evicted the one failure because forty channels synced fine is
   useless. Decide whether to store successes and say why.
5. Add a row in More opening a list screen, newest first, showing time, job, outcome, and code.
   Provide export (copy or share) and clear. Use `FlatList` per
   [`mobile-list-virtualization`](/.cursor/rules/mobile-list-virtualization.mdc).
6. Accessibility per [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc):
   each row reads as one coherent item, not four unlabeled fragments.
7. Strings go in the **`mobile`** catalog. Unit tests for the cap, eviction order, code extraction,
   and the failure-retention rule.

## Constraints

- This is a diagnostics surface: plain, dense, and low in the More list. No empty-state
  illustration.
- Rows stay small — the cap exists to keep this invisible in device storage.
- Do not run tests during implementation.

## Done when

A failed sync job appends an entry carrying its error code while the indicator shows nothing, the
table never exceeds 500 rows, failures survive a flood of successes, and the log is readable and
exportable from More.
