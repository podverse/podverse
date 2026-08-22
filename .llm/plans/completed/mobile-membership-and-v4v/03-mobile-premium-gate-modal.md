# 03 — Premium blocked-action modal + gate wiring

**Cursor model:** Codex 5.3
**Master step:** Track 19.4 (563) — mobile gate UX.
**Ship bar:** Member-only actions stay visible; attempting one while non-member/expired shows a
consistent modal with **Cancel** and a context-aware **Renew / Sign Up** action that routes to the
Membership screen (04). Expired members also see a persistent banner.

## Why

The API already blocks member-only actions with a `membership.*` 403 (01). Mobile must turn those into
a friendly, actionable modal instead of a raw error, and pre-annotate known member-only actions.

## Scope

1. **Shared modal primitive** `apps/mobile/src/components/feedback/PremiumGateModal.tsx` (reuse the
   existing RN `Modal` bottom-sheet pattern from `MediaRowActions`/`MoreOpmlScreen` — there is no
   shared Dialog yet; keep this one small and reusable).    Props: `visible`, `reason`
   (`'expired' | 'insufficient_tier' | 'limit'` — same set web maps from `i18nKey`), `onCancel`,
   `onRenew`. Two buttons:
   - **Cancel** → `onCancel` (dismiss).
   - **Renew / Sign Up** → `onRenew`; the label is **auth-based** (binary) from
     `useMembership().isLoggedIn`, **not** from `reason`:
     - **logged-out → "Sign Up"**.
     - **logged-in → "Renew"** — every account gets a free trial at sign-up, so a logged-in user always
       has a membership to renew. There is **no "Upgrade" variant**.
   - **Where this modal actually fires:** gated mutations require auth, so a **logged-out** user hits
     the existing auth/login prompt (401), not this modal. In practice this modal is shown to
     **logged-in** users → the CTA is almost always **"Renew"**. ("Sign Up" is the primary CTA on the
     Membership screen (04), which logged-out users can open directly from the More menu.)
   - `reason` drives only the **body copy** (not the button), using the **same** semantics as web's
     `getMembership403ModalProps`: `expired` = non-alarming "renew to use this"; `insufficient_tier` =
     "premium feature — extend/renew to Premium"; `limit` = feature limit reached. Keep the mobile copy
     aligned with the web `membership.*` catalog strings.
2. **Gate context** `apps/mobile/src/membership/MembershipGateProvider.tsx` +
   `useMembershipGate()`:
   - `openGate(reason)` shows the modal; **Renew** navigates to the Membership screen (04) via the
     `MoreMembership` route (deep link `more/membership`) and dismisses.
   - `runGated(action)` helper: awaits an API action, and if it throws a membership 403 (detected via
     the shared `parseMembershipGateError` + `membershipDenial.ts` from 02 — the **same** detector web
     uses), calls `openGate(reason)` instead of surfacing a raw error. Reuse
     `skipApiRequestErrorLogForMembershipGate` so these 403s don't log as errors.
3. **Expired banner** `apps/mobile/src/components/feedback/MembershipExpiredBanner.tsx`: when
   `useMembership().isExpired`, show a persistent, non-alarming banner with a "Renew" action → Membership
   screen (web parity: `MembershipExpiredBanner.tsx`). Mount near the app chrome/root.
4. **Wire known member-only actions** to `runGated`/`openGate` (mirror the API's valid-membership set):
   podcast **subscribe/follow**, **playlist create/edit**, **add-by-RSS parse**, **stats**/
   **notifications** toggles, queue mutations. Keep the action buttons **visible** (do not hide);
   the gate fires on attempt. Replace the existing inline `features.search.add_needs_membership`
   message on Podcast Index add with the modal.
5. **i18n:** add mobile catalog keys for modal title/body per reason, button labels, and banner copy
   (mobile namespace). Reuse `membership.*` semantics from web where sensible. No literals in the
   primitive — pass localized strings in.

## Guards

- Keep all existing `testID`s; add `testID`s: `premium-gate-modal`, `premium-gate-cancel`,
  `premium-gate-renew`, `membership-expired-banner`.
- Do not hide gated controls; gate on press.
- No new heavy deps; reuse RN `Modal` + existing `Button`/`Card` primitives.
- Strict equality; no `as`; `import type`.

## Acceptance

- Attempting a member-only action while expired/none shows the modal with the right copy + CTA label.
- Cancel dismisses; Renew/Sign Up navigates to the Membership screen.
- Expired members see the persistent banner.
- Podcast Index add uses the modal (no more inline-only message).

## Verification (operator)

```bash
npm --prefix apps/mobile run test
```

E2E is covered in step 07.
