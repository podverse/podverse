# 12 — Production Launch and Grace Period

## Goal

Ship the in-place store upgrade, and run a rolling migration window while v4
remains usable. Beta and production already share the production database.

## Status

The grace period is 30 days, and the end can be extended. Store approval dates
stay unknown.

## What we know

- The grace period is 30 days. It starts when users can actually install v5
  from the store, not when the build is submitted. Apple and Google review
  time is not part of those 30 days.
- The end can be moved later. Forced migration and the min-version raise wait
  for that end, including an extension. Do not pin them to a calendar date
  chosen before the build is installable.
- The announcement names an earlier date. That public date is the nudge. The
  message says that after it, an account that has not updated to NextGen is
  migrated for them. The batch still runs at the real end, which is later.
- v4 binary stays untouched; v4 API stays up for un-upgraded clients
  ([11](11-web-api-and-url-cutover.md)).
- Lazy migration runs on first v5 login ([07](07-account-and-data-migration-model.md)).
- Communication plan in [10](10-user-communication.md).

## Proposed approach

### Launch sequence (high level)

1. Beta and production share the production database. There is no beta
   database to freeze, back up, or promote
   ([09](09-beta-environment.md)).
2. Confirm a backup of that production database before the identity seed.
3. Seed every v4 user as an account before public signup: email, password
   hash, name, verified, and the v4 id. Leave the library for login or the
   end-of-grace batch. An email already in v5 is skipped and reported.
4. Confirm v5 API/web health, billing sandbox flags off for real money, AASA /
   assetlinks live.
5. Submit v5 mobile under v4 store ids ([03](03-store-identity-and-signing.md))
   with staged rollout (Play) / phased release (iOS) as available.
6. On approval: announce grace start; enable lazy migration at full rate.
7. Once v5 is live in at least one place, disable the v4 subscription products
   in Apple, Google Play, and PayPal. A new v4 purchase fails. The old app may
   not explain the failure. Support tells the person to upgrade to v5. Someone
   who has not been copied can still use v4 until their copy or the end of the
   grace period.
8. After enough accounts exist, run membership expiry import (corrected SQL;
   parked plan under `.llm/plans/active/v4-membership-expiry-import/`).
9. Monitor: migration success/fail counts, API latency, crash-free sessions,
   support volume.

### Grace period operations

- Once a day, the operator reviews how many accounts are copied, how many are
  left, and how many copies failed. That review is what justifies moving the
  grace end later. There is no separate watcher in this plan.
- Reminder communications mid-window.
- Capacity headroom on v4 DB for lazy reads and on v5 for writes.
- Rollback: pause staged rollout; v4 remains the fallback client.
- Open the rest of the staged rollout after one full day of sign-in copies
  with no rise in failed copies and no rise in support contacts. No numeric
  crash-free bar until that day has produced a baseline.

## Honest limits and risks

- Approval can take days or weeks; do not schedule forced migration on a fixed
  calendar date until the store build is live.
- Staged rollout means only a fraction of users see v5 at first — migration
  metrics will ramp slowly.
- Dual systems cost money and attention. Thirty days is the target. Extend the
  end if review, rollout, or migration trouble uses the window up.

## Future plan sets

- Operator launch checklist (ordered, with owners).
- Monitoring and alert list for migration jobs.
- Operator step for moving the grace end date later.
