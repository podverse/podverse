# 12 — Production Launch and Grace Period

## Goal

Take beta to production, ship the in-place store upgrade, and run a rolling
migration window while v4 remains usable.

## Status

Draft. Needs operator review. Store approval dates are **unknown**; plan for
slippage.

## What we know

- Grace period starts when users can actually install v5 from the store, not
  when we submit the build.
- v4 binary stays untouched; v4 API stays up for un-upgraded clients
  ([11](11-web-api-and-url-cutover.md)).
- Lazy migration runs on first v5 login ([07](07-account-and-data-migration-model.md)).
- Communication plan in [10](10-user-communication.md).

## Proposed approach

### Launch sequence (high level)

1. Freeze beta for promotion; backup beta DB.
2. Promote beta → prod ([09](09-beta-environment.md)).
3. Confirm v5 API/web health, billing sandbox flags off for real money, AASA /
   assetlinks live.
4. Submit v5 mobile under v4 store ids ([03](03-store-identity-and-signing.md))
   with staged rollout (Play) / phased release (iOS) as available.
5. On approval: announce grace start; enable lazy migration at full rate.
6. Stop **new** v4 membership sales when v5 checkout is ready (exact day TBD);
   keep v4 redeem/restore paths working until shutdown if needed.
7. After enough accounts exist, run membership expiry import (corrected SQL;
   parked plan under `.llm/plans/active/v4-membership-expiry-import/`).
8. Monitor: migration success/fail counts, API latency, crash-free sessions,
   support volume.

### Grace period operations

- Weekly (or daily) count of migrated vs remaining accounts.
- Reminder communications mid-window.
- Capacity headroom on v4 DB for lazy reads and on v5 for writes.
- Rollback: pause staged rollout; v4 remains the fallback client.

## Honest limits and risks

- Approval can take days or weeks; do not schedule forced migration on a fixed
  calendar date until the store build is live.
- Staged rollout means only a fraction of users see v5 at first — migration
  metrics will ramp slowly.
- Dual systems cost money and attention; decide the grace length with that in
  mind.

## Open questions

- Target grace length (for example 30 / 60 / 90 days) once live?
- When exactly to stop v4 PayPal / store product purchases?
- Who watches migration dashboards day-to-day?
- Minimum crash-free / support thresholds to expand the staged rollout to 100%?

## Future plan sets

- Operator launch checklist (ordered, with owners).
- Monitoring and alert list for migration jobs.
- Decision record for grace length after first week of live data.
