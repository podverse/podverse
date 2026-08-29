# 02 — Anonymous subscriptions

**Cursor model:** Opus 5
**Reasoning:** high
**Detail:** [701-anonymous-subscriptions](/docs/proposals/mobile/_master-plan_/phase-2/details/701-anonymous-subscriptions.md)
**Master step:** P2.4.2
**Depends on:** 01

Read [00-SUMMARY.md](00-SUMMARY.md) decisions 27–31 before starting.

## Goal

Local subscriptions become the source of truth on mobile, so a signed-out user can subscribe and
keep those subscriptions. Account hydration becomes a sync input rather than the origin.

## Subscribing has three behaviors

`POST /account/follow/channel` requires a **valid membership** today and that gate **stays**. What
changes is that mobile no longer needs the server to subscribe at all.

| User state                            | Subscribe                                          | Unsubscribe  |
| ------------------------------------- | -------------------------------------------------- | ------------ |
| Not signed in                         | Works, **local only** — nothing reaches the server | Always works |
| Signed in, valid membership           | Works and syncs to the account                     | Always works |
| Signed in, invalid/expired membership | **Blocked** with an explanatory message            | Always works |

**Never gate unsubscribe.** `unfollowChannel` already skips the membership check server-side; do not
add one on the client.

## Work

1. Add a local subscription table in `apps/mobile/src/data/db/` with a migration, storing directory
   subscriptions alongside the existing add-by-RSS feeds.
2. Rework `apps/mobile/src/data/repositories/subscriptionsRepository.ts` so `list()` reads local
   records and is correct offline and signed out. Keep the existing merge and article-stripped sort
   in `subscriptionsMerge.ts`.
3. Write subscribe/unsubscribe through the repository regardless of auth state. When signed in, push
   the change to the account as a sync side effect, not as a precondition for the local write.
4. Make every subscribe/unsubscribe control in the app work signed out, and surface the explanatory
   message when a signed-in user without a valid membership attempts a server-side follow. Use the
   tier seam from prompt 01 rather than re-deriving gating.
5. **New bulk follow endpoint** in `apps/api`: accepts a list of channel ids, is **idempotent**, and
   reports per-channel outcomes. Sequential single-follow calls are not acceptable — a large local
   list would hit rate limits. Add Joi schemas under `apps/api/src/schemas/`, a request helper in
   `packages/helpers-requests`, and keep OpenAPI in sync per **swagger-openapi**. The OPML import
   controller is the closest existing precedent for outcome reporting.
6. **Sign-in reconciliation:** on sign-in or account creation, push local subscriptions through the
   bulk endpoint and merge additively — a channel on either side ends up subscribed. Idempotent
   across repeat sign-ins.
   - If the account's membership is invalid the sync is blocked. **Retain** local subscriptions on
     the device, tell the user they will sync on renewal, and retry later. Never silently drop them.
7. **Sign-out:** retain local subscriptions; do not clear.
8. Keep add-by-RSS at membership tier via the seam from prompt 01. The add-by-RSS list still renders
   from local storage for everyone.
9. Unit tests for merge behavior — local-only, remote-only, both, repeat merges — the blocked-sync
   path, and signed-out subscribe persistence. Integration tests for the bulk endpoint including
   repeat submission.
10. Extend `apps/mobile/e2e/library-subscriptions.yaml` (or add a focused flow) to cover subscribing
    while signed out and seeing it persist across a relaunch.

## Constraints

- Screens keep reading through repositories; no `req*` calls from screens for subscription data.
- Do not let a failed network sync roll back a local subscribe.
- **No web change from this step.** Web's subscribed list stays account-backed — an intentional
  divergence, since a phone is personal and a shared browser is not. Do not "fix" web to match.
- Do not run tests during implementation.

## Done when

A signed-out user can subscribe, relaunch, and still see it; a member syncs; a non-member is told
why they cannot; unsubscribe always works; sign-in merges without loss through the bulk endpoint;
sign-out retains; add-by-RSS is membership-gated.
