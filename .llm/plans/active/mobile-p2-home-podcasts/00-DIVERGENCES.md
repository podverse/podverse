# Implementation divergences from the locked decisions

Where an implementation had to depart from a decision locked in [00-SUMMARY.md](00-SUMMARY.md), and
why. Recorded as it happens rather than at the end, per prompt 18 step 4. Do not silently diverge
from a locked decision — add an entry here instead.

Recorded as they happen rather than at the end, per prompt 18 step 4.

**Prompt 02 — local subscriptions merge into an account at sign-up only, not on every sign-in.**
Decision 31 and detail 701 specified an **additive** merge on sign-in ("a channel on either side ends
up subscribed"). Combined with decision 30's retain-on-sign-out, that resurrected unsubscribes: sign
in, subscribe, sign out, unsubscribe locally, sign in again, and the channel returns because the
server still has it. The operator resolved it by narrowing the merge instead of adding tombstones —
local subscriptions are pushed up **only** by the login that follows a sign-up on this device, and
after that the **account is the source of truth**. A later sign-in to an existing account therefore
replaces local rows with the account's rather than uploading them, so a phone cannot silently rewrite
an account also used on the web. There is no additive merge and no resurrection.

**Prompt 02 — sign-out retains all local data, not just subscriptions.** Decision 30 covered
subscriptions. The operator extended it to everything local, including add-by-RSS feeds and the
car/watch browse index, on the grounds that this is the same data offline mode depends on. Add-by-RSS
feeds therefore stay visible and playable signed out (`add_by_rss_view` is already anonymous tier);
only adding and refreshing remain membership-gated.

**Prompt 02 — the account sync was silently truncating to one page.** `syncFromAccount` hydrated only
page 1 of the subscribed list. That was invisible while the rows were a display cache, but they now
decide whether a channel shows as subscribed, so anything past the first page would have read as
unsubscribed. It now pages to the end under a fixed ceiling.

**Prompt 01 — the tier seam lives in `packages/helpers`, not `packages/helpers-requests`.** The plan
put it beside `parseMembershipGateError`. But its only input, `deriveMembershipState`, already lives
in `@podverse/helpers` and is already consumed by both surfaces, so `helpers-requests` would have
split membership derivation across two packages. Tier resolution is pure account derivation with no
HTTP in it. `helpers-requests` keeps the genuinely HTTP-shaped part: `accessDenialReasonFromGate`,
mapping a 403 onto the shared `AccessDenialReason`. Update the cross-surface table row above when
prompt 18 reconciles status.

**Prompt 01 — membership expiry is not a notification at all.** Detail 700 named four reminder
surfaces, the fourth being a push near expiry. That was over-engineering, and a scheduled
`membership-expiry-reminder` job plus a worker handler had already been built for it. Both are
removed, along with the ORM scheduler service that enqueued them. Expiry is now three **in-app**
surfaces only, all derived on demand from the account snapshot via `getMembershipExpiryNotice` in
`@podverse/helpers`. Enforced by the rule
[`no-membership-expiry-notifications`](/.cursor/rules/no-membership-expiry-notifications.mdc).
Scheduled jobs remain a supported mechanism generally — admin notification campaigns still use them.
