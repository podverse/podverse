# Podverse MetaBoost Response Hardening

## Goal

Harden Podverse boost-form behavior so Metaboost capability and ingest failures are handled deterministically, user-visible states are accurate, and response-contract coverage is tested for both `mbrss-v1` and `mb-v1`.

## Why This Plan Exists

- Current flow can report boost success even when metadata POST did not succeed.
- `sender_blocked` handling can leave submit loading state stuck.
- Owner terms enforcement responses (for example `owner_terms_not_accepted_current`) are not explicitly mapped to clear UX.
- `mb-v1` capability handling has weaker test coverage than `mbrss-v1`.

## Scope

- Podverse web boost payment flow and Metaboost capability parsing.
- Targeted tests for request/response edge cases.
- No Metaboost server-side changes in this plan.

## Out of Scope

- Rewriting the entire boost UX.
- Changing Metaboost API contracts.
- Broad i18n copy redesign beyond new/required error messaging keys.
