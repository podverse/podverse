---
name: e2e-authz-matrix
description: Adds membership-state-based access control coverage to Playwright specs. Use when testing pages or features that behave differently based on the user's membership state so tests assert the correct visible, hidden, blocked, and available states.
version: 1.0.0
---


# E2E AuthZ Matrix (Membership-State-Based)

Use this skill for membership-sensitive routes and controls. Current E2E bar: **Confident**.

Podverse uses membership-state-based access control rather than role-based permissions. For the full membership-state testing process (matrix table, seed data, per-state test implementation), see **e2e-membership-state-matrix**.

## Required membership-state matrix

For each membership-gated surface, include at least:

- Unauthenticated user
- Authenticated user with active premium (happy path)
- Authenticated user with expired or no membership (blocked state)

Add trial-specific states when the surface involves premium-only features:

- Authenticated user with active trial

## Required assertions

- Redirect or 401 behavior for unauthenticated requests.
- Action visibility differences (`visible` vs `not rendered`) by membership state (e.g. premium-only buttons hidden for free users).
- Action availability differences (`enabled` vs `disabled` or blocked) by membership state.
- Blocked mutation attempts return stable UI feedback: upsell CTA, membership prompt, or error message.
- Membership expiration toast appears correctly: danger toast (expired), warning toast (expiring within 14 days).

## Completion checklist

- [ ] At least one non-happy-path membership assertion exists for each membership-gated flow touched.
- [ ] Visibility and blocked-state checks are both present where UI supports both.
- [ ] No membership-gated scenario is marked complete with only route-load assertions.
- [ ] Trial-specific restrictions tested for premium-only features (Add-by-RSS, MQ).
