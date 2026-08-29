# 207-auth-me-bootstrap

**Master step:** 6.8
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- On app launch: hydrate tokens from secure storage → if access token present, call `reqAuthMe`
  with bearer `AuthContext`.
- Success → `authenticated` + account in store; show authenticated shell (hello-world or nav).
- Failure (401) → attempt refresh once (6.4); if still failing, clear session → login/anonymous.
- While hydrating, show brief splash / null status `unknown` so UI does not flash login.

## Acceptance criteria

- Cold start restores session without re-entering password when tokens valid
- Invalid/expired family results in cleared storage
- Bootstrap runs before main content that requires auth

## Web parity references

- [`reqAuthMe`](/packages/helpers-requests/src/api/auth/auth.ts) — pass bearer via service
  `authContext`; do not rely on cookie `withCredentials` for mobile
- Web SSR bootstrap is cookie-based; mobile is token-based equivalent

## Verification

```bash
# Operator: login once, kill app, relaunch — session remains
npm run mobile:ios -- --device "iPhone 17 Pro"
```
