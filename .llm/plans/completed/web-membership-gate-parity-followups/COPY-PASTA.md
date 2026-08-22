# COPY-PASTA — web-membership-gate-parity-followups

Complete web↔mobile parity for membership gating. Run steps in order; each is independent.
Prereq already landed: `apps/web/src/hooks/useMembershipGate.ts` (Step 8 of mobile-membership-and-v4v).

---

## Step 1 — Gate "Add to Queue" (member-only) across web rows — DONE (2026-08-05)

**Cursor model:** Claude Opus (multi-file refactor across ~16 components with a shared helper; needs
careful pattern consistency and E2E). 

> Implement `.llm/plans/completed/web-membership-gate-parity-followups/01-queue-add-gate.md`.
> Add a shared `useQueueAddWithGate()` hook (or equivalent helper) that awaits the queue add-item
> promise, routes membership 403s through `useMembershipGate().tryHandleMembershipGateError`, and
> otherwise preserves today's success/error toast. Replace every `showToastPromise(reqQueueResource*Add
> {Next,Last,Between}(...), {success, error})` call site (list in the plan) with the helper. Keep the
> logged-out `login_to_add_to_queue` guard unchanged. Extend `apps/web/e2e/membership-gating.spec.ts`
> with an expired-member "Add to Queue Next" case (mock the real membership-expired 403). Do not run
> tests; end with the operator verify block.

**Completed:** New `apps/web/src/hooks/useQueueAddWithGate.ts` (`runQueueAdd(action, { success, error })`)
routes queue-add membership 403s through `useMembershipGate().tryHandleMembershipGateError` and otherwise
preserves the prior success/error toast. Converted every `showToastPromise(reqQueueResource*Add{Next,Last}
(...))` call site across 15 row/header components (Item, Clip, ItemSoundbite, AddByRSS variants). Left
`ListQueueResources.handleDragEnd` alone — it already routes through the gate (Step 8) and its reorder
reinserts via these same member-gated add endpoints. `AddBetween`/`AddHistory`/`AddNowPlaying` were left
out of scope (Between only occurs in the already-gated drag path; History/NowPlaying are separate
mark-as-played / playback actions). Added an expired-member "Queue: Next" case to
`apps/web/e2e/membership-gating.spec.ts` (mocks the real `membership_expired` 403 on
`POST /queue/*/item/*/next`, drives the `/episode/e2ePodResume03` More menu, asserts the membership modal
+ Renew → `/membership/renew`).

---

## Step 2 — Gate web-push enable (member-only device register) — DONE (2026-08-05)

**Cursor model:** Claude Sonnet (small, localized: one lib + `SettingsNotifications` + verify
`NotificationIconButton`). 

> Implement `.llm/plans/completed/web-membership-gate-parity-followups/02-webpush-enable-gate.md`.
> Make the membership 403 from `reqAccountWebPushDeviceCreate/Update` observable to callers by
> rethrowing it from `requestNotificationPermission.ts` (detect via `parseMembershipGateError`) instead
> of swallowing it in the generic `alert()`. In `SettingsNotifications.enableWebPush`, handle it via the
> already-imported `tryHandleMembershipGateError`. Verify `NotificationIconButton.toggleNotification`
> now shows the modal (no double alert). Keep the logged-out guard. Do not run tests; end with the
> operator verify block.

**Completed:** `requestNotificationPermission.ts` now rethrows a membership 403 (detected via the shared
`parseMembershipGateError`) from the member-gated `reqAccountWebPushDeviceCreate/Update` instead of
swallowing it in the generic `alert()`; non-membership failures keep the alert + console behavior.
`SettingsNotifications.enableWebPush` gained a `catch` that routes the rethrown 403 through the
already-imported `tryHandleMembershipGateError` (else `console.warn`). `NotificationIconButton.
toggleNotification` needed no change — its existing `catch` now receives the rethrown 403 and opens the
modal with no double alert. Added `requestNotificationPermission.test.ts` (jsdom): success → true (no
alert); membership 403 → rethrows, no alert; non-membership failure → resolves false + one alert (uses the
real `parseMembershipGateError`).

---

## Final verification (operator — after both steps)

Prereqs: **Mobile Metro/API not needed** (web only). Build first if packages changed.

```bash
npm run build:packages
make e2e_test_web_report_spec SPEC=e2e/membership-gating.spec.ts,e2e/podcast-index-feed-add-trial-blocked.spec.ts
open .artifacts/e2e-reports/latest/index.html
```
