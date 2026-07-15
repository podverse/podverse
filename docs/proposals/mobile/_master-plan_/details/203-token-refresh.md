# 203-token-refresh

**Master step:** 6.4
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- On 401 from authenticated API calls, attempt **one** refresh via `reqAuthMobileRefresh` with
  stored `refresh_token`, then retry the original request once.
- Rotate: replace both access and refresh tokens in secure storage + auth store on success.
- Refresh-token **reuse** (`code: 'refresh_token_reuse_detected'` or equivalent): clear session and
  force re-login (family revoked server-side).
- Concurrency: coalesce concurrent 401s into a single in-flight refresh (mutex / promise latch).
- Do not refresh when there is no refresh token (anonymous / logged-out).

## Architecture notes

- Prefer a single interceptor or wrapper on the mobile `ApiRequestService` / request helper — avoid
  duplicating refresh logic in every screen.
- `reqAuthMe` today defaults `withCredentials: true` in helpers-requests; mobile path must still send
  **bearer** headers and must not rely on cookies. Prefer service-level `authContext` + ensuring
  mobile requests do not set cookie credentials (detail 209).

## Edge cases

- Refresh 401 / reuse → wipe tokens, set status anonymous / unauthenticated
- Offline / network error during refresh → surface recoverable error; do not wipe unless reuse/401
- Expired access + valid refresh → transparent retry succeeds

## Acceptance criteria

- Single-flight refresh; no token stampede
- Reuse detection clears local session
- Unit-testable pure helpers for decision tree where practical (no SecureStore in Vitest)

## Web parity references

- [`refreshMobileToken`](/apps/api/src/lib/auth/index.ts) / `POST /auth/mobile/refresh`
- [`reqAuthMobileRefresh`](/packages/helpers-requests/src/api/auth/auth.ts)
- API tests: [`apps/api/src/test/auth.test.ts`](/apps/api/src/test/auth.test.ts)

## Verification

```bash
# Operator after implement: login, wait/force expiry if possible, confirm /auth/me still works
npm run mobile:e2e:api:health
```
