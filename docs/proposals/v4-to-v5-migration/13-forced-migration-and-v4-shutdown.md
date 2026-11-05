# 13 — Forced Migration and v4 Shutdown

## Goal

When the grace period ends, migrate remaining accounts, force clients onto v5,
and retire v4 infrastructure safely.

## Status

Draft. Needs operator review.

## What we know

- Operator intent: remaining v4 accounts are forcibly migrated; the v4 app
  becomes unusable afterward.
- `MINIMUM_MOBILE_VERSION` already blocks old binaries with a store update
  overlay (no v4 app release required).
- Batch migration should reuse the same pipeline as lazy migration
  ([07](07-account-and-data-migration-model.md)).

## Proposed approach

### End-of-grace sequence

1. Announce final deadline ([10](10-user-communication.md)).
2. Run **batch migrate** for all not-yet-migrated accounts; review failure
   report (counts and legacy ids only).
3. Re-run membership expiry import for any stragglers.
4. Set `MINIMUM_MOBILE_VERSION` above the last v4 release so remaining v4
   installs see Update Required (button opens the listing that now serves v5).
5. Make v4 API **read-only** briefly (optional), then shut down writers
   (parsers, queues) and finally the API.
6. Point remaining hostnames per [11](11-web-api-and-url-cutover.md).
7. Archive a final encrypted DB dump **outside** git; retain per legal /
   support needs; then decommission VMs when satisfied.

### Failure handling

- Accounts that fail batch migration: support queue with manual retry; do not
  silently drop membership.
- Unmapped catalog refs: user lands with partial library; document in FAQ.

## Honest limits and risks

- Forced migration cannot fix unresolved id maps; some history/clips stay lost.
- Users offline for weeks after shutdown only see the update overlay when they
  next open the app.
- Turning off v4 too early while staged rollout is not at 100% strands users
  who have not received the v5 binary yet. **Require 100% store rollout (or
  equivalent) before min-version enforcement.**

## Open questions

- Exact min-version value to set (must be the first v5 store version)?
- Retention period for the archived v4 dump?
- Keep a read-only v4 API longer for emergency support?

## Future plan sets

- Batch worker runbook with throttle settings.
- Shutdown checklist for ansible/ops hosts.
- Postmortem template after cutover week one.
