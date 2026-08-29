# 202-mobile-token-login

**Master step:** 6.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Create mobile `ApiRequestService` factory using `getMobileApiBaseUrl()` from
  [`apiBaseUrl.ts`](/apps/mobile/src/config/apiBaseUrl.ts) (host/port/prefix/version from env or
  defaults matching `apiMobileE2e` / local API).
- Login action calls `reqAuthMobileToken` from `@podverse/helpers-requests` with
  `{ email, password }` — **no** `withCredentials`.
- On success: persist `access_token` + `refresh_token` via secure storage; update auth store;
  configure subsequent requests with `AuthContext { mode: 'bearer', token: access_token }`.
- Map 401 → user-facing invalid credentials (i18n key later OK; English stub acceptable this phase).

## Acceptance criteria

- `POST /auth/mobile/token` used (not `/auth/login`)
- Tokens stored only in secure storage
- Authenticated `ApiRequestService` instances include bearer context

## Web parity references

- [`reqAuthMobileToken`](/packages/helpers-requests/src/api/auth/auth.ts)
- [`ModalAuthLogin.tsx`](/apps/web/src/components/Modal/ModalAuthLogin.tsx) — email + password fields
- [API-CLIENT-BOUNDARIES.md](/docs/development/API-CLIENT-BOUNDARIES.md)

## Verification

```bash
# Operator: deps + seed + API :4230 + Metro e2e; then manual login once screens exist
npm run mobile:e2e:api:health
```
