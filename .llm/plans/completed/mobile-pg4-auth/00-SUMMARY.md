# Mobile PG-4 — Track 6 bearer auth

**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
**Steps:** 6.1–6.12
**Detail IDs:** 200–211
**Status:** planned (not implemented)

## Goal

Ship bearer auth on `apps/mobile`: secure token storage, session store, `/auth/mobile/*` login /
refresh / revoke, login + signup screens, launch bootstrap, anonymous mode, and Maestro
login/logout against the E2E API harness @ **4230**.

## Locked decisions

| Item | Decision |
| ---- | -------- |
| Token storage | `expo-secure-store` preferred |
| API auth | Bearer only — never cookies / `withCredentials` |
| Wrappers | `reqAuthMobileToken` / `Refresh` / `Revoke` + bearer `reqAuthMe` |
| Anonymous UX | Anonymous-first with login CTA (UI Maestro stays unauthenticated) |
| Seed user | `e2e-user@example.com` / `Test!1Aa` |
| E2E areas | `auth-login`, `auth-logout` |

## Outputs

- `apps/mobile/src/auth/**` (+ screens under `src/screens/auth/`)
- Mobile `ApiRequestService` factory with bearer + refresh interceptor
- Maestro `auth-login.yaml` / `auth-logout.yaml`
- Master-plan steps 6.1–6.12 → `done` as each COPY-PASTA prompt finishes

## Out of scope

- Track 7 tab navigator (see `mobile-pg4-nav`)
- Full home/browse (Tracks 8–9)
- Cookie web login paths
- Management-api bearer auth
