# 701-anonymous-subscriptions

**Master step:** P2.4.2
**Model (author + implement):** Opus 5
**Status:** planned

## Scope

Today `subscriptionsRepository` hydrates from the account
(`reqChannelGetMany({ type: 'subscribed' })`) and caches the result, so a signed-out user has no
subscriptions at all. Mobile must work signed out, so this step makes **local subscriptions the
source of truth** on mobile.

### Subscribing has three behaviors, not one

`POST /account/follow/channel` requires a **valid membership** today, and that gate stays. What
changes is that mobile no longer needs the server in order to subscribe at all.

| User state                            | Subscribe                                          | Unsubscribe  |
| ------------------------------------- | -------------------------------------------------- | ------------ |
| Not signed in                         | Works, **local only** — nothing reaches the server | Always works |
| Signed in, valid membership           | Works and syncs to the account                     | Always works |
| Signed in, invalid/expired membership | **Blocked**, with a message explaining why         | Always works |

**Unsubscribing is never gated.** Not by tier, not by an expired membership. `unfollowChannel`
already skips the membership check server-side; mobile must not add one on top.

### Sign-in sync

When a signed-out user creates an account or signs in, their local subscriptions sync up to the
server account. Merge is **additive and idempotent** — a channel present on either side ends up
subscribed, and repeat sign-ins change nothing.

No bulk endpoint exists today; the nearest thing is the async OPML import job. This step adds a
**new bulk follow endpoint** that accepts a list of channel ids, is idempotent, and reports
per-channel outcomes. Sequential single-follow calls are not acceptable — a large local list would
hit rate limits.

The bulk endpoint follows the same membership rule as single follow. **Open assumption for operator
review:** if a user signs into an account whose membership is invalid, the sync is blocked; local
subscriptions are retained on the device and sync when the membership becomes valid. The user is
told this rather than silently losing the merge. If new accounts always begin with a valid trial,
this path is rare but still needs defined behavior.

### Also in scope

- A local subscription record written on subscribe/unsubscribe regardless of auth state, stored in
  SQLite alongside the existing add-by-RSS feeds.
- `subscriptionsRepository.list()` reads local records first and stays correct offline and signed
  out; account hydration becomes a **sync input**, not the source.
- **Sign-out:** local subscriptions are retained, not cleared.
- Add-by-RSS remains **membership** tier and is unavailable signed out, because it needs server-side
  parsing. The add-by-RSS list itself still renders from local storage.

### Intentional divergence from web

Web's subscribed list is account-backed and always requires sign-in. Mobile's is local-first. These
are **not** converging: a phone is a personal device where local-only subscriptions make sense, and a
shared browser is not. Web needs no change from this step.

This is a foundational step — Home list, filter, sort, and seen state all assume it. Sequence it
early.

## Acceptance criteria

- A signed-out user can subscribe, close and reopen the app, and still see the subscription.
- The subscribed list, filter, and sort behave identically signed out and signed in.
- A signed-in user without a valid membership cannot create a server-side follow and sees an
  explanatory message, not a silent failure.
- Unsubscribe succeeds in every tier and membership state, including expired.
- A new bulk follow endpoint exists, is idempotent, reports per-channel outcomes, and is covered by
  integration tests including repeat submission.
- Creating an account from a signed-out session syncs local subscriptions up; nothing subscribed
  anonymously is lost.
- Signing out leaves the local subscription list intact.
- Screens continue to read through repositories; no screen calls `req*` for subscription data.
- Unit tests cover merge behavior (local-only, remote-only, both, repeat merges) and the blocked-sync
  path; E2E covers subscribing while signed out and seeing it persist.

## Web parity references

- `apps/mobile/src/data/repositories/subscriptionsRepository.ts`, `subscriptionsMerge.ts`,
  `addByRssRepository.ts`
- `apps/api/src/controllers/account/accountFollowingChannel.ts` — `followChannel` membership gate,
  `unfollowChannel` without one
- `apps/api/src/routes/account.ts`, `packages/helpers-requests/src/api/account/follow/channel.ts`
- `apps/api/src/controllers/account/` OPML import — closest existing bulk precedent
- `apps/web/src/app/podcasts/` — account-backed list; intentional divergence, no web change
- Rule: [`mobile-anonymous-vs-account-features`](/.cursor/rules/mobile-anonymous-vs-account-features.mdc)
- Skills: **mobile-data-layer**, **api-testing**, **swagger-openapi**

## Verification

```bash
npm run lint
npm run test:unit
npm run test:e2e:api
npm run mobile:e2e:test -- library-subscriptions
```
