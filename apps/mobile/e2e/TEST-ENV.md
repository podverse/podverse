# Mobile E2E test environment

Mobile E2E flows run from monorepo root and use Maestro flows in `apps/mobile/e2e/`.
`npm run mobile:e2e:test` boots E2E devices (`iPhone 17 Pro E2E`, `Pixel_6_Pro_API_33_e2e`) but
does **not** install the app or start Metro — operators run those in other terminals. Manual npm
scripts use separate slots (`iPhone 17 Pro`, `Pixel_6_Pro_API_33`).

## Flow classes

- **UI-only flows** (example: `hello-world`) do not require API, seeded DB, or `make test_deps`.
- **API-backed flows** (future auth/home/library coverage) require a reachable API base URL and
  deterministic seed data.

## API expectations for API-backed flows

- Prefer a dedicated mobile E2E API target instead of reusing web Playwright ports by default.
- If running against local Podverse test env, document and export the chosen API URL before running.
- Keep seed prerequisites explicit in flow docs so operators know when to run setup commands.

## Seed expectations

- UI-only smoke: no seed required.
- Auth/home/library flows: deterministic seed required (user accounts, feeds, and queue fixtures).
- Reuse existing Podverse test-env concepts where possible, but do not assume web E2E seed layout is
  automatically correct for mobile.

## Operator run examples

```bash
npm run mobile:dev
npm run mobile:e2e:ios
npm run mobile:e2e:android
npm run mobile:e2e:test
npm run mobile:e2e:test -- hello-world
```

Review reports:

```bash
open .artifacts/mobile-e2e-reports/latest/index.html
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
