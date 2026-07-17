# 492-data-layer-account-repo

**Master step:** 9b.3
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

- Account/session snapshot repository: hydrate `/auth/me` into SQLite for cold-start display;
  tokens remain in SecureStore.
- Wire `AuthProvider` to read account snapshot from repository after token hydrate.

## Acceptance criteria

- Logged-in cold start shows account from DB while optional soft-refresh runs
- Logout clears account rows (and tokens via existing SecureStore path)
- Auth E2E still passes

## Web parity references

- Web: `apps/web/src/contexts/Account.tsx` (behavior only)
- Mobile auth: `apps/mobile/src/auth/`

## Verification

```bash
npm run mobile:e2e:test -- auth
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
