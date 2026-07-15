# 079-e2e-expo-api-url

**Master step:** 5.20
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Wire the mobile app so E2E builds can reach the host API:
  - iOS Simulator: `http://localhost:4230` (or documented host equivalent)
  - Android Emulator: `http://10.0.2.2:4230`
- Prefer `EXPO_PUBLIC_*` (or existing app config pattern once present) so Metro can inject the
  base URL without baking Playwright ports.
- Update [TEST-ENV.md](/apps/mobile/e2e/TEST-ENV.md), [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md),
  [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md), and **mobile-e2e-screenshots** skill for
  API-backed vs UI-only prerequisites.
- Add a minimal Maestro smoke (e.g. `api-health` or tagged flow) that proves the app or a
  diagnostics surface can see a live API — **not** full login (that remains 6.11).

## Locked decisions

| Item          | Decision                                          |
| ------------- | ------------------------------------------------- |
| Host port     | 4230                                              |
| Android host  | `10.0.2.2`                                        |
| iOS host      | `localhost`                                       |
| Login Maestro | Deferred to 6.11 / 6.12 after this step is `done` |

## Acceptance criteria

- Documented env var(s) and example values for iOS and Android E2E
- Docs/skills distinguish UI-only vs API-backed operator paths
- Minimal API-backed smoke flow exists under `apps/mobile/e2e/` (or explicit skip doc if app
  has no network UI yet — prefer a tiny diagnostics assert when feasible)
- Master steps 5.17–5.20 and Appendix C marked `done` when phase archives

## Verification

```bash
rg -n '4230|10\.0\.2\.2|apiMobileE2e|API-backed|mobile_e2e_deps' apps/mobile/e2e/ apps/mobile/APPS-MOBILE.md .cursor/skills/mobile-e2e-screenshots/SKILL.md
```

## Depends on

- 5.17–5.19 / 076–078

## Blocks

- 6.11, 6.12
