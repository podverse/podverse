# 711-defer-auto-renew-aware-reminders

**Master step:** P2.3.9
**Model (author + implement):** Codex 5.3
**Status:** draft — deferred to a future phase

## Scope

Membership renewal reminders land in
[700-access-tiers-and-membership-gating](/docs/proposals/mobile/_master-plan_/phase-2/details/700-access-tiers-and-membership-gating.md)
at four points: when the user touches a membership feature, a persistent row in More/settings, a
dismissible Home banner, and a push notification near expiry.

A user enrolled in **auto-renew** should not receive "expiring soon" reminders — their membership is
not actually about to lapse. Suppressing those requires knowing auto-renew status, which requires
payment functionality that does not exist yet.

Deferred until payment lands. The reminder surface built in detail 700 must leave a clean seam for
this check so adding it later is a predicate change, not a rework.

When this is picked up:

- Resolve auto-renew enrollment for the current account.
- Suppress **expiry-approaching** reminders for enrolled users across all four surfaces.
- Keep **lapsed** reminders for enrolled users whose renewal actually failed — auto-renew enrollment
  is not a guarantee of successful payment.
- Decide whether an auto-renew user sees any positive confirmation instead of a reminder.

## Acceptance criteria

- Auto-renew status is resolvable for the signed-in account.
- Expiry-approaching reminders are suppressed for enrolled users on all four surfaces.
- A failed auto-renewal still produces lapsed-state reminders.
- The suppression is a single predicate consulted by every reminder surface, not four copies.
- Unit tests cover enrolled, not enrolled, and enrolled-but-payment-failed.

## Web parity references

- `apps/mobile/src/screens/more/MoreMembershipScreen.tsx`
- Detail 700 — reminder surfaces this modifies
- Rule: [`mobile-anonymous-vs-account-features`](/.cursor/rules/mobile-anonymous-vs-account-features.mdc)
  § Expired membership is degraded, never frozen

## Verification

```bash
npm run lint
npm run test:unit
npm run mobile:e2e:test -- membership
```
