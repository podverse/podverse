# Mobile E2E test environment

Mobile E2E flows run from monorepo root and use Maestro flows in `apps/mobile/e2e/`.
`npm run mobile:e2e:test` boots E2E devices (`iPhone 17 Pro E2E`, `Pixel_6_Pro_API_33_e2e`) but
does **not** install the app or start Metro — operators run those in other terminals. Manual npm
scripts use separate slots (`iPhone 17 Pro`, `Pixel_6_Pro_API_33`).

## Flow classes

- **UI-only flows** (example: `hello-world`) do not require API, seeded DB, or `make test_deps`.
- **API-backed flows** (future auth/home/library coverage) require a reachable API base URL and
  deterministic seed data.

## Harness status (Track 5.17–5.20)

Step **5.17** is `done`: `apiMobileE2e` is locked to `API_PORT=4230` with
`API_PUBLIC_BASE_URL=http://localhost:4230`.

Steps **5.18–5.20** are `done`:

- shared test deps + seed wrappers (`mobile_e2e_deps`, `mobile_e2e_seed`)
- long-lived API lifecycle wrappers (`mobile:e2e:api*`)
- platform-specific E2E API URL wiring (`mobile:dev:e2e`)

Track 6 auth flows are now present:

- `auth-login` (6.11)
- `auth-logout` (6.12)

Track 7 nav E2E flow is now present:

- `tab-switch-playback` (7.18)

Step **5.18** is now `done` for data prep wrappers:

- `make mobile_e2e_deps` reuses shared `test_deps` (Postgres `5732`, Valkey `6679`)
- `make mobile_e2e_seed` reuses `e2e_seed_web` (`tools/web/seed-e2e.mjs`)

Default `npm run mobile:e2e:test` remains UI-only and does **not** auto-run deps/seed.

Step **5.19** is now `done` for long-lived API lifecycle wrappers:

- `npm run mobile:e2e:api` (foreground) starts API with `apiMobileE2e` env on `:4230`
- `npm run mobile:e2e:api:stop` stops managed background API process
- `npm run mobile:e2e:api:health` checks `/api/v2/health` and `/api/v2/health/ready`
- Make aliases: `make mobile_e2e_api`, `make mobile_e2e_api_stop`, `make mobile_e2e_api_health`

**API server env (not a mobile `.env` file):** `scripts/mobile/e2e-api.sh` rebuilds
`@podverse/helpers-config` + `@podverse/api`, then starts with
`buildPodverseApiTestEnv({ profile: 'apiMobileE2e' })` + `PODVERSE_SKIP_DOTENV=true` — same
idea as web Playwright `apiWebE2e` @ 4030. `make local_env_setup` / `apps/mobile/.env` only
configure the **mobile client** base URLs; they do not configure the API process launched by
`mobile:e2e:api`.

The API starter fails clearly if port `4230` is already busy and never falls back to `4030`.

Step **5.20** client URL wiring is in place for E2E dev-server startup:

- `EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS=http://localhost:4230/api/v2`
- `EXPO_PUBLIC_MOBILE_API_BASE_URL_ANDROID=http://10.0.2.2:4230/api/v2`
- `make local_env_setup` now generates `apps/mobile/.env` from `apps/mobile/.env.example`
- Helper command: `npm run mobile:dev:e2e` still exports both vars as E2E overrides before `expo start`

`make local_env_setup` can derive day-to-day local API URLs from shared `LOCAL_API_*` values (often
`localhost:3000`). For API-backed Maestro, use `mobile:dev:e2e` so the runtime env is explicitly
overridden to the E2E API (`:4230/api/v2`) regardless of what `.env` contains.

The app resolves base URL via `Platform.select` (`ios` localhost, `android` 10.0.2.2) and stays
nullable when variables are unset so UI-only flows remain valid.

## API expectations for API-backed flows

- Prefer a dedicated mobile E2E API target instead of reusing web Playwright ports by default.
- If running against local Podverse test env, document and export the chosen API URL before running.
- Keep seed prerequisites explicit in flow docs so operators know when to run setup commands.

## Seed expectations

- UI-only smoke: no seed required.
- Auth/home/library flows: deterministic seed required (user accounts, feeds, and queue fixtures).
- Reuse existing Podverse test-env concepts where possible, but do not assume web E2E seed layout is
  automatically correct for mobile.

Seeded auth credential for future mobile login/logout flows (6.11 / 6.12):

- Email: `e2e-user@example.com`
- Password: `Test!1Aa`

API-backed pre-run uses **separate terminals**. Do not chain Metro/API into one pasteable shell
with Maestro — see [HOW-TO-RUN.md](./HOW-TO-RUN.md).

```bash
# One-shot prep (exits)
make mobile_e2e_deps
make mobile_e2e_seed

# Terminal 1 — leave running
npm run mobile:dev:e2e

# Terminal 4 — leave running (after installs in T2/T3, or in parallel)
npm run mobile:e2e:api

# Other shell after API is up
npm run mobile:e2e:api:health

# Terminal 5 — after Metro + installs + API are up
npm run mobile:e2e:test -- api-health
```

Or background API from the prep shell: `npm run mobile:e2e:api:bg` then
`npm run mobile:e2e:api:health` (stop later with `npm run mobile:e2e:api:stop`).

## Operator run examples

UI-only (leave Metro running in its own terminal):

```bash
# Terminal 1 — leave running: npm run mobile:dev
npm run mobile:e2e:ios
npm run mobile:e2e:android
npm run mobile:e2e:test -- hello-world
```

Review reports:

```bash
open .artifacts/mobile-e2e-reports/latest/index.html
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
