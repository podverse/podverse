# Plan 04 — Expo / app API base URL for E2E

Read and implement detail
[079-e2e-expo-api-url](/docs/proposals/mobile/_master-plan_/details/079-e2e-expo-api-url.md)
(client-config portion; docs/smoke close-out is plan 05).

## Work

1. Invent or reuse the app’s public API base URL config (`EXPO_PUBLIC_*` or existing pattern under
   `apps/mobile/`). There is no wired `EXPO_PUBLIC` API URL today — add the minimal surface.
2. Document / support:
   - iOS Simulator: `http://localhost:4230`
   - Android Emulator: `http://10.0.2.2:4230`
3. Prefer Platform.select or documented env files / `.env.e2e` so Metro injects the right host
   without sharing web Playwright `4030`.
4. Keep anonymous/offline UI-only flows working when the URL is unset if that is current behavior;
   do not require API for hello-world.

## Done when

```bash
rg -n '4230|10\.0\.2\.2|EXPO_PUBLIC' apps/mobile/ apps/mobile/e2e/TEST-ENV.md
```

Do **not** mark 5.20 done yet — plan 05 completes 079.
