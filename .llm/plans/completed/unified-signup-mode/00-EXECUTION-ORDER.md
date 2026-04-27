# Unified signup mode -- execution order

**Read first:** [00-SUMMARY.md](./00-SUMMARY.md) (overview, constraints, DoD).

## Hard rule

Phases run in **order** (01 through 06). Do not skip phases. Later phases assume types, DB columns, and API contracts from earlier phases exist.

## Phase map

| Order | File | What it does | Repo |
|------:|------|--------------|------|
| 1 | [01-rename-and-align-constants.md](./01-rename-and-align-constants.md) | Rename `AUTH_MODE` to `ACCOUNT_SIGNUP_MODE` in Metaboost. Align value names and capability types across both repos. | Metaboost |
| 2 | [02-podverse-nullable-email-and-username.md](./02-podverse-nullable-email-and-username.md) | Make `AccountCredentials.email` nullable. Add `username` column (nullable, unique). Update ORM entity, creation service, and auth to support username-or-email login. | Podverse |
| 3 | [03-podverse-admin-only-username-mode.md](./03-podverse-admin-only-username-mode.md) | Add `admin_only_username` mode support: startup validation, mailer gating, invite link flow, set-password endpoint. Management API user creation with username-only option. | Podverse |
| 4 | [04-podverse-email-gated-features.md](./04-podverse-email-gated-features.md) | Gate email-dependent features (password reset, email verification, email change) behind `canUseEmailVerificationFlows`. Update web UI to hide/show these features. | Podverse |
| 5 | [05-web-and-management-web-ui.md](./05-web-and-management-web-ui.md) | Update Podverse web app (login, signup, forgot password, settings) and management-web (user form) to handle all three modes. | Podverse |
| 6 | [06-tests-and-e2e.md](./06-tests-and-e2e.md) | Integration tests for new auth modes. E2E specs for admin_only_username flow. Startup validation tests per mode. | Both |

## Parallelization

This set is **sequential**. Each phase builds on types and DB schema from the previous one. Do not parallelize.

## Estimated scope

| Phase | Files touched (est.) | Risk |
|-------|---------------------|------|
| 01 | ~20 | Low (rename/refactor) |
| 02 | ~15 | Medium (DB schema change, ORM migration) |
| 03 | ~20 | Medium (new API endpoints, management API changes) |
| 04 | ~10 | Low (feature gating) |
| 05 | ~15 | Medium (UI changes across web + management-web) |
| 06 | ~20 | Low (tests) |
