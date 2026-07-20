# 03 — Account / session snapshot repository

Implement master step **9b.3**.

## Detail docs

- [492-data-layer-account-repo](/docs/proposals/mobile/_master-plan_/details/492-data-layer-account-repo.md)

## Decision / skills

- [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
- **mobile-data-layer**; auth remains bearer + SecureStore

## Tasks

1. Add account/session snapshot tables + `accountRepository` (or equivalent) that upserts `/auth/me`
   (or existing mobile me bootstrap payload) into SQLite.
2. Wire `AuthProvider` to read account snapshot from the repository after token hydrate; soft-refresh
   in background when online.
3. On logout: clear account rows; tokens still cleared only via SecureStore path.
4. Keep DTO shapes via `@podverse/helpers` subpaths — never the helpers barrel.
5. Mark **9b.3** / **492** `done`.

## Acceptance

- Logged-in cold start can show account from DB while soft-refresh runs
- Logout clears account rows; tokens never stored in SQLite
- Auth Maestro flow still intended to pass (operator verifies)

Do not run tests during agent work.
