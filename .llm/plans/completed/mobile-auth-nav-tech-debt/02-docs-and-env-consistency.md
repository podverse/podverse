# 02 — Docs and env consistency

## Scope

Remove doc/env confusion between local day-to-day API ports and mobile E2E **4230**.

## Changes

### 1. HOW-TO-RUN stale hosts

File: [apps/mobile/e2e/HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md)

Update the API-backed section that still describes Metro inject hosts as
`http://localhost:4230` / `http://10.0.2.2:4230` **without** `/api/v2`. Match
[scripts/mobile/dev-e2e.sh](/scripts/mobile/dev-e2e.sh) and
[apps/mobile/e2e/TEST-ENV.md](/apps/mobile/e2e/TEST-ENV.md):

- `EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS=http://localhost:4230/api/v2`
- `EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID=http://10.0.2.2:4230/api/v2`

### 2. Clarify `.env.example` vs `local_env_setup`

Files:

- [apps/mobile/.env.example](/apps/mobile/.env.example)
- Optionally a short note in [apps/mobile/e2e/TEST-ENV.md](/apps/mobile/e2e/TEST-ENV.md) and/or
  [apps/mobile/APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md)

Explain:

- `make local_env_setup` derives mobile iOS/Android base URLs from shared `LOCAL_API_*` /
  web sidecar defaults (often **3000** for day-to-day local API).
- Committed `.env.example` may show **4230** paths as E2E-oriented examples — after setup, values
  can differ.
- Maestro / API-backed Metro must use `npm run mobile:dev:e2e` (shell exports win over `.env`).

Do **not** change `setup.sh` port defaults in this plan unless docs alone are insufficient — prefer
documentation clarity over rewiring local web defaults.

## Do not

- Change E2E API port **4230** harness
- Run tests

## Verification (operator)

Docs-only: skim HOW-TO-RUN + TEST-ENV for consistency. No Maestro required unless you also touched
scripts (should not).
