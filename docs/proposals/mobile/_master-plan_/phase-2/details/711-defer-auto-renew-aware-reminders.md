# 711-defer-auto-renew-aware-reminders

**Master step:** P2.3.9
**Model (author + implement):** Codex 5.3
**Status:** deferred to a future phase

## Scope

Membership renewal reminders land in
[700-access-tiers-and-membership-gating](/docs/proposals/mobile/_master-plan_/phase-2/details/700-access-tiers-and-membership-gating.md)
at three **in-app** points: when the user touches a membership feature, a persistent row in
More/settings, and a dismissible banner on Home. There is no push and no email — see the rule
[`no-membership-expiry-notifications`](/.cursor/rules/no-membership-expiry-notifications.mdc).

A user enrolled in **auto-renew** should not be told their membership is expiring soon — it is not
actually about to lapse.

**Correction to the original premise:** this is not blocked on the field existing.
`account_membership_status.auto_renew` is already on the account DTO and web's
`MembershipExpirationToast` already consults it to suppress the expiring-soon toast. What is missing
is that the status carries both `auto_renew` and `auto_renew_mode` with no settled rule for which is
authoritative, and no payment flow to make either trustworthy.

Deferred until payment lands. Detail 700 leaves the seam: `shouldSuppressExpiryReminder` in
`@podverse/helpers` is consulted by every reminder surface and returns `false` today, so enabling
this is a change in that one function.

## Confirmed against what shipped

The seam holds. `shouldSuppressExpiryReminder` still returns `false` unconditionally, and mobile's two
expiring-soon surfaces both consult it: `MembershipExpiredBanner` and the persistent renewal row in
`apps/mobile/src/navigation/index.tsx`. `GatedFeatureNotice` deliberately does not — it explains a
membership that has already lapsed, and lapsed messaging stays on for enrolled users whose renewal
failed. Web's `MembershipExpirationToast` still reads `auto_renew` directly; folding that into the
predicate is the first task when this is picked up, exactly as recorded below.

No push, email, or scheduled job for expiry exists on any surface.

When this is picked up:

- Settle whether `auto_renew` or `auto_renew_mode` is authoritative, and fold web's existing
  ad-hoc `auto_renew` read in `MembershipExpirationToast` into the shared predicate.
- Suppress **expiring-soon** messaging for enrolled users on every surface.
- Keep **lapsed** messaging for enrolled users whose renewal actually failed — auto-renew enrollment
  is not a guarantee of successful payment.
- Decide whether an auto-renew user sees any positive confirmation instead of a reminder.

## Acceptance criteria

- Expiring-soon messaging is suppressed for enrolled users on every surface, web included.
- A failed auto-renewal still produces lapsed-state messaging.
- The suppression is a single predicate consulted by every surface, not one copy per surface.
- Unit tests cover enrolled, not enrolled, and enrolled-but-payment-failed.
- Nothing added here introduces a push, email, or scheduled job for membership expiry.

## Web parity references

- `apps/web/src/components/Toast/MembershipExpirationToast.tsx` — the existing `auto_renew` read
- `packages/helpers/src/lib/accessTier.ts` — `shouldSuppressExpiryReminder`, the seam
- `apps/mobile/src/screens/more/MoreMembershipScreen.tsx`
- Detail 700 — reminder surfaces this modifies
- Rule: [`mobile-anonymous-vs-account-features`](/.cursor/rules/mobile-anonymous-vs-account-features.mdc)
  § Expired membership is degraded, never frozen

## Verification

```bash
npm run lint
npm run test:unit
npm run mobile:e2e:test -- membership-gate
```
