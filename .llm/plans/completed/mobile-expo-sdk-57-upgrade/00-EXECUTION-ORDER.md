# Expo SDK 52 → 57 upgrade — execution order

Locked decisions and inventory: [00-SUMMARY.md](./00-SUMMARY.md).
Paste prompts from [COPY-PASTA.md](./COPY-PASTA.md). Model / reasoning
lines live in COPY-PASTA and at the top of each numbered plan (not in this
file).

## Step 0 — Operator baseline commit (before Prompt 01, preferred)

Commit the uncommitted EAS / Play-setup work on a branch **before** any
upgrade code lands, so the SDK 57 diff stays reviewable in isolation.

Include at least:

- `apps/mobile/app.config.ts` — `owner` + `extra.eas.projectId`
- `apps/mobile/eas.json` — `base` Node pin + profile `extends`
- `apps/mobile/package.json` — `eas-build-pre-install` / `eas-build-post-install`
- `scripts/mobile/eas-build-pre-install.sh`
- `.github/workflows/mobile-internal.yml`, `mobile-staging-beta.yml`,
  `mobile-production-submit.yml` (no `--cwd`)
- `docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md`
- Google Play docs from the same session (`docs/billing/BILLING-GOOGLE-PLAY-DEVICE.md`
  and any link edits in BILLING.md / SANDBOX / AUTO-RENEW / QUICKSTART /
  APPS-MOBILE.md)

Do **not** include `pv-nixos-flake` eas-cli changes in the Podverse commit
(separate repo). Agents do not run `git commit` / `git push` unless the
operator asks in that message.

If Step 0 is skipped (e.g. overnight), Prompt 01 still runs and notes that
the EAS baseline and SDK bump may share one later commit.

## Order

| Step | Plan | Parallel? | Agent gate before next |
| ---- | ---- | --------- | ---------------------- |
| 1 | [01-dependency-bump.md](../../completed/mobile-expo-sdk-57-upgrade/01-dependency-bump.md) | Alone | Agent confirms Expo 57 / RN 0.86 / expo-iap 5.x |
| 2 | [02-js-api-migrations.md](../../completed/mobile-expo-sdk-57-upgrade/02-js-api-migrations.md) | Alone after 01 | Implementation done (no full type-check yet) |
| 3 | [03-billing-expo-iap.md](../../completed/mobile-expo-sdk-57-upgrade/03-billing-expo-iap.md) | Alone after 02 | **Checkpoint A (agent):** `type-check:mobile` + mobile unit tests green (fix or stop with report) |
| 4 | [04-ios-native.md](../../completed/mobile-expo-sdk-57-upgrade/04-ios-native.md) | Alone after A | Agent: `mobile:reset` + `mobile:ios -- --device "iPhone 17 Pro"` succeeds |
| 5 | [05-android-native.md](../../completed/mobile-expo-sdk-57-upgrade/05-android-native.md) | Alone after 04 | Agent: `mobile:reset` + `mobile:android -- --device Pixel_6_Pro_API_33` succeeds |
| 6 | [06-device-and-maestro-pass.md](../../completed/mobile-expo-sdk-57-upgrade/06-device-and-maestro-pass.md) | Alone | Agent starts E2E API/test-assets/Metro in background, installs E2E apps, runs Maestro, tears stack down. CarPlay / USB stay morning notes |
| 7 | [07-guidance-and-docs.md](../../completed/mobile-expo-sdk-57-upgrade/07-guidance-and-docs.md) | Alone | Docs / abcmemory match SDK 57 |
| 8 | [08-eas-build-and-play.md](../../completed/mobile-expo-sdk-57-upgrade/08-eas-build-and-play.md) | Alone (last) | Agent runs `eas build` (beta/android). **Stops** for Play Console upload. Archives after build success + Play handoff text |

## Why this order

1. **01 first** — later prompts need the SDK 57 type surface and lockfile.
2. **02 then 03 (sequential)** — same ownership split as before, but sequential
   so Checkpoint A at the end of 03 sees a complete tree. Do not start 03
   until 02 is finished.
3. **Checkpoint A (agent-run in 03)** — catch type and unit failures before
   native work.
4. **04 before 05** — CarPlay / AppDelegate is the highest-risk native change.
5. **06 after native** — Maestro after both platforms build.
6. **07 after 06** — document what shipped.
7. **08 last** — EAS build then human Play Console.

## Ownership (02 / 03)

| Prompt | Owns | Must not touch |
| ------ | ---- | -------------- |
| 02 | File-system / Reanimated / notifications / React 19 / safe-area / netinfo call sites outside billing | `apps/mobile/src/billing/**` |
| 03 | Entire `apps/mobile/src/billing/**` plus **Checkpoint A** (may fix type-check errors outside billing only when they block the gate; prefer minimal fixes and note them) | package.json pins (01) |

## Agent rules for every prompt (this set)

**Exception to the repo default:** for this plan set, agents **must run** the
verify commands listed in each numbered plan (type-check, unit tests, device
builds, Maestro, `eas build` as specified). Prompt 06 may start/stop E2E
leave-running processes via background shells and the `:bg` / `:stop` scripts.
Use `./scripts/nix/with-env` for Node/npm where needed; do **not** wrap
`mobile:ios` / `mobile:android` / `mobile:reset` / `mobile:pod-install`
(they strip Nix themselves).

Still true:

- Do **not** `git commit`, `git push`, or `gh` writes unless the operator
  asks in that message.
- Do **not** click Play Console or invent device failures.
- Comments stay future-forward (no plan numbers).
- Plan prose follows **llm-safe-plan-vocabulary**.
- End each prompt with a short result summary (what passed / what failed).

If a gate fails and the agent cannot fix it within ownership, **stop** with
the failure output and exact next paste — do not continue to the next phase
inside the same prompt.

## Unattended overnight (01–08)

Paste prompts **one after another as each finishes**. Preferred sleep path:
Step 0 optional → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08.

- Prompt **06** starts/stops E2E leave-running processes in **background
  shells** (no VS Code tabs required).
- Prompt **08** runs `eas build`; Play Console upload stays morning.
- Machine must stay awake with network, Xcode/Android SDKs, and
  `eas whoami` already working.

## Cumulative verification (final response of Prompt 08)

Agents will already have run most of these during earlier prompts. Prompt 08
re-lists them for the operator morning review:

```bash
npm run build:packages
npm run lint
npm run type-check:mobile
npm --prefix apps/mobile run test
npm run mobile:reset
npm run mobile:ios -- --device "iPhone 17 Pro"
npm run mobile:android -- --device Pixel_6_Pro_API_33
```

**Mobile Maestro** (leave-running E2E Metro / iOS / Android / API already up
per HOW-TO-RUN):

```bash
npm run mobile:e2e:test:all
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
