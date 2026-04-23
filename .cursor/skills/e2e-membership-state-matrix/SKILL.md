---
name: e2e-membership-state-matrix
description: Test that features are correctly available or blocked based on the user's membership state. Use when testing pages or features that behave differently depending on whether the user is unauthenticated, has no membership, has an expired membership, has an active trial, or has active premium.
version: 1.0.0
---

# E2E Membership State Matrix

Use this skill when implementing E2E tests for any membership-gated surface. Current E2E bar: **Confident**.

## Membership states

Podverse uses membership-state-based feature gating, not role-based CRUD permissions. There are 6 membership states that affect feature availability:

| State                        | account_membership_id | membership_expires_at | API behavior                                        |
| ---------------------------- | --------------------- | --------------------- | --------------------------------------------------- |
| Unauthenticated              | n/a                   | n/a                   | 401 Unauthorized                                    |
| Authenticated, no membership | null                  | null                  | 403 Membership expired                              |
| Expired trial                | 1 (Trial)             | past date             | 403 Membership expired                              |
| Expired basic                | 2 (Basic)             | past date             | 403 Membership expired                              |
| Active trial                 | 1 (Trial)             | future date           | Most features; blocked from Add-by-RSS + MQ in prod |
| Active basic (premium)       | 2 (Basic)             | future date           | Full access                                         |

## API enforcement levels

The API has three enforcement levels per endpoint, controlled by auth middleware options:

| Middleware options                                   | Behavior                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `{ skipMembershipStatus: true }`                     | Auth required, no membership check                              |
| `{ skipMembershipStatus: false }`                    | Auth + valid (non-expired) membership required                  |
| `{ skipMembershipStatus: false, noFreeTrial: true }` | Auth + active basic (premium) only; trial blocked in production |

## Process

### 1. Identify membership enforcement for the surface

Check the API route/controller to determine which enforcement level applies:

- Skip membership: only unauthenticated vs authenticated matters.
- Membership required: unauthenticated, expired/none, and active states all behave differently.
- Premium-only (noFreeTrial): trial users are also blocked from the feature.

### 2. Define the membership state matrix

Build a table of **membership state x expected outcome** for the surface being tested:

- **Unauthenticated** -> redirect to login (web) or 401 (API).
- **No membership / expired** -> 403 on API calls; upsell CTA or membership prompt visible on web.
- **Active trial** -> feature available, except premium-only features (Add-by-RSS parse, MQ in production).
- **Active basic (premium)** -> full access to all features.

Not every surface requires testing all 6 states. Collapsed states (no membership + expired trial + expired basic) share the same API behavior (403) so they can often be tested as one "expired/none" group. Test all 6 states when the UI renders differently for each (e.g. different toast messages, different CTA text on the membership page).

### 3. Seed data and login helpers

- Ensure E2E seed includes accounts in each required membership state.
- Provide login helpers that log in as a specific membership state.
- Membership state is stored in `account_membership_status` (fields: `account_membership_id`, `membership_expires_at`).

### 4. Implement tests

- **Unauthenticated:** redirect to login or 401 response.
- **Expired / no membership:** API returns 403 "Membership expired"; web shows upsell CTA or blocks the action. Assert membership expiration toast when applicable.
- **Active trial:** happy path for most features; blocked from premium-only features (Add-by-RSS parse, MQ). Assert trial-specific UI messaging when present.
- **Active basic (premium):** full happy path with all features available.
- **Flow tests:** membership page shows correct CTA per state; purchasing/extending membership updates state correctly.

### 5. Trial-specific restrictions

In production, trial accounts are blocked from:

- Add-by-RSS parse operations (`enqueueParse`, `enqueueParseAll`, `getParseStatus`)
- Message queue (MQ) endpoints

These restrictions use the `noFreeTrial: true` middleware option. Tests for these features should assert that trial users receive a 403 with `i18nKey: 'membership.free_trial_not_allowed'`.

### 6. Membership expiration toast

The web app shows contextual toasts based on membership state:

- **Danger toast** (always on page load): membership is expired.
- **Warning toast** (dismissible for 24h): expiring within 14 days, not auto-renew.

Tests that cover toast behavior should assert the correct toast type appears for the membership state.

### 7. Membership page (MembershipCTA)

The membership page (`/membership`) shows different CTAs per state:

- Not logged in -> "Sign Up"
- Expired -> "Extend My Membership"
- Active trial -> "Buy Premium Membership"
- Active basic -> "Extend My Membership"

### 8. Quality bar

- Every membership state has at least one test asserting the expected outcome for the surface.
- Expired/none states assert upsell or blocked behavior.
- Trial-specific restrictions are tested for premium-only features.
- Navigation flows to the membership page show the correct CTA for each state.

## Cross-reference

- **e2e-crud-state-matrix:** CRUD and UI-state coverage for user-generated content (playlists, clips).
- **e2e-authz-matrix:** Membership-state-based access control assertions.
- **e2e-readability:** Verbose step names for membership-state tests.

## Completion checklist

- [ ] Membership enforcement level identified for the surface.
- [ ] Membership state matrix table defined.
- [ ] Seed data and login helpers exist for all required membership states.
- [ ] Unauthenticated test present.
- [ ] Expired/none membership state tests assert blocked behavior or upsell.
- [ ] Active trial tests cover happy path and trial-specific restrictions where applicable.
- [ ] Active basic tests cover full happy path.
- [ ] Membership page CTA correctness tested when the surface involves the membership page.
- [ ] Targeted spec run passes.
