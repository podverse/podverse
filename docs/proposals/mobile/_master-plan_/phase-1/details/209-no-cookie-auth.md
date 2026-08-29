# 209-no-cookie-auth

**Master step:** 6.10
**Model (author + implement):** Auto
**Status:** done

## Scope

- Mobile API client configuration must never set `withCredentials: true` or cookie auth mode.
- Audit new `apps/mobile` request helpers: only `AuthContext` `none` | `bearer`.
- Document in `apps/mobile/AGENTS.md` (one line if not already present) — already stated; reinforce
  in `APPS-MOBILE.md` auth subsection if missing.
- Prefer `reqAuthMobile*` over `reqAuthLogin` / `reqAuthLogout` / cookie `reqAuthMe` defaults.

## Acceptance criteria

- Grep of `apps/mobile` shows no `withCredentials: true`
- No `mode: 'cookie'` in mobile auth wiring
- Login uses `/auth/mobile/*` only

## Operator notes

- helpers-requests web wrappers may still default cookies; mobile factory must override/avoid those
  options explicitly.

## Verification

```bash
rg -n "withCredentials|mode: 'cookie'" apps/mobile/src || true
```
