# 700-access-tiers-and-membership-gating

**Master step:** P2.4.1
**Model (author + implement):** Opus 5
**Status:** planned

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
resolve tiers the same way, so the seam lives in **`packages/helpers-requests`**, extending the
existing shared `parseMembershipGateError` / `MembershipDenialReason` types rather than adding a
second parallel model.

| Surface | Consumes the seam via                                                   |
| ------- | ----------------------------------------------------------------------- |
| Shared  | `packages/helpers-requests` — tier resolution and denial-reason parsing |
| Mobile  | A hook/selector answering "what tier is this user in"                   |
| Web     | `useMembershipGate` refactored onto the shared resolver                 |

Web's refactor must be behavior-preserving: existing login modals and 403 membership modals keep
working, now derived from one tier model instead of two independent checks.

### Lapsed membership

A lapsed member keeps a working app. Anonymous- and account-tier capability is unaffected.
Membership features present a renewal affordance rather than a dead or missing control. For
add-by-RSS specifically: existing feeds stay visible and playable but **stop refreshing**, and
adding new feeds is blocked.

Renewal reminders appear at four points: when the user touches a membership feature, as a persistent
row in More/settings, as a dismissible Home banner, and as a push notification near expiry.

**Auto-renew carve-out is deferred.** Users enrolled in auto-renew should not receive
"expiring soon" reminders, but payment functionality does not exist yet. Build the reminder surface
so that check drops in later without rework — see
[711-defer-auto-renew-aware-reminders](/docs/proposals/mobile/_master-plan_/phase-2/details/711-defer-auto-renew-aware-reminders.md).

## Acceptance criteria

- A shared tier resolver in `packages/helpers-requests` reports the active tier and denial reason;
  mobile and web both consume it and neither re-derives gating from auth state plus membership fields
  independently.
- Web's `useMembershipGate` is refactored onto the shared resolver with no user-visible behavior
  change.
- Every gated control renders one of: the working feature, an upgrade affordance, or a renewal
  affordance — never a control that silently fails.
- Anonymous and account tiers are fully usable with no membership present.
- A lapsed member can still browse, subscribe, filter, sort, download, and play, and still sees
  previously added add-by-RSS feeds.
- Renewal reminders render at the four points above and the Home banner is dismissible.
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
- Existing mobile strings `features.search.add_needs_login` / `add_needs_membership`
- Skill: **entitlement-gating-rollout**

## Verification

```bash
npm run lint
npm run test:unit
make e2e_test_web_report_spec SPEC=e2e/membership.spec.ts
npm run mobile:e2e:test -- membership
```
