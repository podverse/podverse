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

1. The public date was already announced, and it is earlier than this sequence
   ([10](10-user-communication.md)).
2. Run **batch migrate** for all not-yet-migrated accounts; review failure
   report (counts and legacy ids only).
3. Re-run membership expiry import for any stragglers.
4. Set the v4 `MINIMUM_MOBILE_VERSION` to the first live NextGen store version
   so remaining v4 installs see Update Required. Leave the number unset until
   that build exists. Raise it while the public v4 meta endpoint still
   answers, before public v4 API requests are blocked.
5. Block public requests to the v4 API. Stop parsers and queues so the
   leftover process does not keep writing. The process may stay on the server
   with no public route.
6. Point remaining hostnames per [11](11-web-api-and-url-cutover.md).
7. Archive a final encrypted DB dump **outside** git. Check that the archive
   opens. Then stop the private v4 process.
8. Keep that archive after the grace window. The operations engineer chooses
   how long it is kept. This plan does not set a retention length. Decommission
   VMs only after that choice, and not before the archive exists.

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
- The v4 overlay is fetched from the public v4 meta endpoint. After public
  requests are blocked, an old app that has not opened yet cannot load that
  overlay.

### NextGen minimum version

v4 blocks an old binary from `GET /api/v1/meta/app-info` and
`MINIMUM_MOBILE_VERSION`. The app compares its installed version with semver.
A blank minimum, a failed request, or no network leaves the app usable. When
the installed version is lower, the app replaces the UI with a blocking
screen and an Update Now button that opens the store.

NextGen does not have that app-wide check. Add it before go-live. This
migration pass does not implement it.

A second floor already exists and stays. It is
`billing_checkout_channel.min_client_version`, one value per store channel,
edited in management-web. It is not an env var, and it is not part of this
migration. At go-live it stays blank. Later it can stop sales on one bad
NextGen build without locking the rest of the app. It filters checkout
options before a purchase starts, so an older NextGen build sees no plans and
tells the person to update.

It does not sit on `POST /apple/transactions` or `POST /google/purchases`.
Those routes run after Apple or Google has already charged, so a 426 there
would refuse to record a payment that already happened. PayPal and Strike
create the charge after our check, and web skips the floor today. Remove the
426 from the Apple and Google transaction routes. When the checkout filter
hides every plan, the app shows an update message rather than an empty list.
v4 never calls v5, so this floor only ever sees an older NextGen binary.

Shape:

- The API publishes one optional minimum, an env value with no code fallback.
  Blank means the check is off. A present value must be valid semver or the
  API refuses to start. Alpha and beta leave it blank. Production is set to
  the first live store version once that build exists.
- The route is public. No session. The body is the minimum version only. It
  does not carry the v4 maintenance schedule.
- The app reads its own marketing version (`app.config` version) and compares
  with semver. Lower than the minimum means update. Equal or higher means
  continue.
- The check runs after the first screen is already up. A network call does not
  sit in front of first paint. Offline, or a failed request, does not block.
- The blocking screen covers the app. The button label is Update Now. The
  sentence asks the person to update Podverse. Both strings live in the i18n
  catalog. The button opens the store listing for the application id of the
  binary that is running. F-Droid stays out of this check until
  [14](14-fdroid.md).
- This check does not replace the v4 `MINIMUM_MOBILE_VERSION` raise. That one
  still forces the old binary, and it is raised while the public v4 meta
  endpoint still answers.

## Future plan sets

- NextGen app-wide minimum-version check, API value plus mobile blocking screen.
- Remove the 426 client-version refusal from the Apple and Google purchase
  routes. Keep `min_client_version` on checkout options only, and show an
  update message when that filter hides every plan.
- Batch worker runbook with throttle settings.
- Shutdown checklist for ansible/ops hosts.
- Postmortem template after cutover week one.
