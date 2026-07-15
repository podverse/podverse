# 201-auth-store

**Master step:** 6.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Auth session store (Zustand **or** React context — pick one; prefer Zustand if already common in
  mobile deps, else context matching ThemeProvider).
- Hold: `status` (`unknown` | `anonymous` | `authenticated`), `accessToken`, `refreshToken`,
  optional `account` (`DTOAccount` summary), `error`.
- Actions: `setTokens`, `clearSession`, `setAccount`, `hydrateFromSecureStorage` (async).
- Persist tokens only via secure storage wrapper (detail 200); in-memory account is fine.

## Acceptance criteria

- Single module under `apps/mobile/src/auth/` (e.g. `authStore.ts` or `AuthProvider.tsx`)
- App can read auth status without importing API client internals
- Clear session wipes secure storage keys

## Web parity references

- Web session via cookies + SSR; mobile state machine is bearer-equivalent
- [`DTOAccount`](/packages/helpers) shape from `reqAuthMe`

## Verification

```bash
test -f apps/mobile/src/auth/authStore.ts -o -f apps/mobile/src/auth/AuthProvider.tsx
```
