# 08 — EAS build and Play upload (last)

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

## Goal

Produce a new Android App Bundle (version code **4+** via remote
`autoIncrement`), hand off Play Console steps to the operator, and archive
this plan set after a successful EAS build.

## Preconditions

- Prompts 01–07 complete enough to ship (device/Maestro deferred items OK if
  documented).
- Expo login works (`eas whoami`); project linked
  (`b6f9f8a2-ea16-44b1-b725-2942c35b6f33`).

## Agent vs operator

| Action | Who |
| ------ | --- |
| `eas build --profile beta --platform android` from `apps/mobile` | **Agent runs** (this set) |
| Play Console upload / rollout / subscriptions / testers | **Operator** (morning) |
| `git commit` / `git push` | Operator unless asked in-message |
| Archive plan set to `completed/` | **Agent** after EAS build succeeds and Play handoff is written |

## Agent steps

1. Confirm `eas whoami` works. If not logged in, **stop** with `eas login`
   instructions (cannot complete unattended).
2. Run the build (eas-cli has no `--cwd`):

```bash
cd apps/mobile && eas build --profile beta --platform android
```

   Wait for completion. Capture artifact URL and `versionCode` (≥ 4).
3. Write the Play Console handoff (do not claim Play accepted anything):
   - Replace version code 3 in the internal-testing draft with the new `.aab`
   - Confirm Billing ≥ 8 and target API ≥ 36 errors are gone
   - Roll out internal testing
   - Then: `premium` + base plans, service account, testers, seed workers,
     USB flow per `docs/billing/BILLING-GOOGLE-PLAY-DEVICE.md`
4. Move this directory to
   `.llm/plans/completed/mobile-expo-sdk-57-upgrade/`
5. End with the cumulative verification block below.

## Done when

- EAS `.aab` built successfully with versionCode ≥ 4
- Play steps written for the operator (not executed by the agent)
- Plan set archived under `completed/`
- Final message lists cumulative verify commands

## Cumulative operator verification (whole set)

```bash
npm run build:packages
npm run lint
npm run type-check:mobile
npm --prefix apps/mobile run test
npm run mobile:reset
npm run mobile:ios -- --device "iPhone 17 Pro"
npm run mobile:android -- --device Pixel_6_Pro_API_33
```

**Mobile Maestro** (E2E Metro / devices / API already up per HOW-TO-RUN):

```bash
npm run mobile:e2e:test:all
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
