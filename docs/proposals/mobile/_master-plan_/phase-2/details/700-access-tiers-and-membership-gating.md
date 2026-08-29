# 700-access-tiers-and-membership-gating

**Master step:** P2.4.1
**Model (author + implement):** Opus 5
**Status:** done

## Scope

Establish three explicit access tiers across `apps/mobile` **and `apps/web`**, and stop treating
gating as a binary "logged in or not" check.

| Tier           | Meaning                                      |
| -------------- | -------------------------------------------- |
| **Anonymous**  | No account at all                            |
| **Account**    | Signed in, no paid membership                |
| **Membership** | Signed in **and** holding a valid membership |

The gate test is: does the feature require a **server-side write** or a **server-side job that must
run**? If yes it is membership-tier unless explicitly assigned otherwise.

Tier assignments are fixed in
[`mobile-anonymous-vs-account-features`](/.cursor/rules/mobile-anonymous-vs-account-features.mdc).
Summary: local subscribe, local list/filter/sort, downloads, offline playback, local queue/history,
local seen state, and **unsubscribing** are **anonymous**; cross-device sync of seen state is
**account**; **server-side follow**, cross-device sync of queue and history, add-by-RSS, and
notifications are **membership**.

### The seam is shared, not mobile-only

Web today splits gating in two places: call sites check `loggedInAccount` before an API call, and
`useMembershipGate` handles the resulting 403. There is no single tier concept. Both surfaces should
resolve tiers the same way, so one shared seam replaces the two parallel models.

**Implemented in `packages/helpers` (`src/lib/accessTier.ts`), not `helpers-requests`.** Tier
resolution is pure account derivation, and its only input — `deriveMembershipState` — already lives
in `@podverse/helpers` and is already consumed by both surfaces. Putting the resolver in
`helpers-requests` would have split membership derivation across two packages. `helpers-requests`
keeps what is genuinely HTTP-shaped: `parseMembershipGateError` plus a new
`accessDenialReasonFromGate` that maps a server 403 onto the shared `AccessDenialReason`, so a
proactive client check and a reactive server denial describe themselves identically.

| Surface | Consumes the seam via                                                                   |
| ------- | --------------------------------------------------------------------------------------- |
| Shared  | `packages/helpers` — `AccessTier`, `GatedFeature`, `evaluateFeatureAccess`              |
| Shared  | `packages/helpers-requests` — `accessDenialReasonFromGate` bridges 403s onto that model |
| Mobile  | `useAccessTier` hook; `GatedFeatureNotice` renders the denial                           |
| Web     | `useMembershipGate` refactored onto the shared resolver                                 |

Web's refactor must be behavior-preserving: existing login modals and 403 membership modals keep
working, now derived from one tier model instead of two independent checks.

### What the three tiers deliberately do not model

`hasValidMembership` is true for **Trial** as well as Premium, so a Trial holder resolves to
`membership` tier. The server draws a further line the client model does not: Trial accounts are
blocked from some Premium capabilities (directory add-by-RSS, tighter refresh and feed limits).

That is intentional. The tier model answers "is this capability plausibly available to this user",
and Trial-vs-Premium capability differences stay **server-authoritative** — a Trial user's request
goes out and the 403 surfaces through `accessDenialReasonFromGate` and the existing gate modal, the
same as before this detail. Adding a fourth tier would duplicate a policy the API already owns and
would drift from it.

Consequence to be aware of when reading gating code: `evaluateFeature(...).allowed === true` means
"not blocked by tier", not "will succeed". Call sites must still handle a 403.

### Lapsed membership

A lapsed member keeps a working app. Anonymous- and account-tier capability is unaffected.
Membership features present a renewal affordance rather than a dead or missing control. For
add-by-RSS specifically: existing feeds stay visible and playable but **stop refreshing**, and
adding new feeds is blocked.

`add_by_rss_refresh` is assigned membership tier in the shared feature table, but **mobile has no
manual refresh control today** — web's refresh lives in `AddByRSSListClient` / `ListChannelSettings`
and is gated reactively by the 403 modal. When mobile grows a refresh control it must consult
`evaluateFeature('add_by_rss_refresh')` rather than inventing a new check.

Renewal reminders appear at three points: when the user touches a membership feature, as a
persistent row in More/settings, and as a dismissible banner on Home.

**Expiry is never a notification.** No push, no email, no scheduled job — see the rule
[`no-membership-expiry-notifications`](/.cursor/rules/no-membership-expiry-notifications.mdc). Each
surface derives "expiring soon" and "expired" on demand from the account snapshot it already holds
(`getMembershipExpiryNotice` in `@podverse/helpers`), so there is nothing to schedule, nothing to
deliver, and nothing for the user to unsubscribe from.

**Auto-renew carve-out is deferred.** Users enrolled in auto-renew should not be told they are
expiring soon, but payment functionality does not exist yet. Build the in-app surfaces so that check
drops in later without rework — see
[711-defer-auto-renew-aware-reminders](/docs/proposals/mobile/_master-plan_/phase-2/details/711-defer-auto-renew-aware-reminders.md).

## Acceptance criteria

- A shared tier resolver in `packages/helpers` reports the active tier and denial reason; mobile and
  web both consume it and neither re-derives gating from auth state plus membership fields
  independently.
- Web's `useMembershipGate` is refactored onto the shared resolver with no user-visible behavior
  change.
- Every gated control renders one of: the working feature, an upgrade affordance, or a renewal
  affordance — never a control that silently fails.
- Anonymous and account tiers are fully usable with no membership present.
- A lapsed member can still browse, subscribe, filter, sort, download, and play, and still sees
  previously added add-by-RSS feeds.
- Renewal reminders render at the three points above and the banner is dismissible; the dismissal is
  remembered against the expiry it was dismissed for, so a later lapse shows it again.
- No expiry reminder is delivered by push, email, or a scheduled job.
- All user-facing copy resolves through i18n; no hardcoded strings.
- Unit tests cover tier resolution including the lapsed case, and E2E covers at least one gated
  control in each tier.

## Web parity references

- `packages/helpers-requests/src/api/parseMembershipGateError.ts` — `MembershipGateError`,
  `MembershipDenialReason`, `MEMBERSHIP_GATE_I18N_KEYS` (the seam to extend)
- `apps/web/src/hooks/useMembershipGate.ts`,
  `apps/web/src/utils/membership/modalForMembership403.tsx` (`Membership403FeatureContext`)
- `apps/web/src/components/Media/Header/SubscribeButton.tsx` — current login-then-403 split
- `apps/mobile/src/screens/more/MoreMembershipScreen.tsx`
- Existing mobile strings `features.search.add_needs_login` / `add_needs_membership` (removed by this
  detail; superseded by the shared `membership.gate.*` keys in the `consumer` catalog)
- Skill: **entitlement-gating-rollout**

## Verification

```bash
npm run lint
npm run test:unit
make e2e_test_web_report_spec SPEC=e2e/membership-gating.spec.ts
npm run mobile:e2e:test -- membership-gate
```
