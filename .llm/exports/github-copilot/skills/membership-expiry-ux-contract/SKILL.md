---
name: membership-expiry-ux-contract
description: Keep expired-membership API + UI behavior consistent. Use when adding or editing expiry-related blocked actions, banners, and renewal flows.
---


# Membership Expiry UX Contract

Use this skill for any membership-expired UX/API work.

## API contract

- Use a clear, non-alarming expired response message.
- Include machine-readable `code` and `i18nKey`.
- Include a renewal destination path when user action is possible.

## UI contract

- Show a persistent expired-state reminder banner.
- Show a blocked-action modal for protected actions.
- Modal includes:
  - dismiss option
  - direct renew action
- Reuse shared modal context types and payload shape.

## Copy principles

- Explain that functionality is reduced until renewal.
- Avoid panic/error-heavy wording.
- Keep message actionable and short.

## Shared helpers

- **Expiry moment:** use `isMembershipExpiredAt` from `@podverse/helpers` when you need “this `membership_expires_at` is in the past” (e.g. banner, marketing copy).
- **Valid non-expired membership:** use `hasValidMembership` for the full status object (e.g. API auth gate: reject when `!hasValidMembership(membershipStatus)`).

## Consistency checks

- Search/add/refresh flows use the same denial mapping.
- Banner, modal, and renewal route are all wired.
- i18n keys exist for all surfaced messages.
