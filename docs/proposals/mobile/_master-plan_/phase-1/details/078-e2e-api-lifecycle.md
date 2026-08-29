# 078-e2e-api-lifecycle

**Master step:** 5.19
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Provide a **long-lived** Podverse API process for Maestro (not Playwright `webServer`).
- Scripts/Make: start API with `apiMobileE2e` env + `PODVERSE_SKIP_DOTENV=true` on port **4230**;
  optional stop/health-check helpers.
- Do not attach API lifecycle to UI-only `mobile:e2e:test` by default.
- Document a fifth operator terminal (or Make target) alongside Metro / e2e:ios / e2e:android /
  e2e:test.

## Locked decisions

| Item          | Decision                                                                              |
| ------------- | ------------------------------------------------------------------------------------- |
| Process owner | Script/Make (operator or foreground npm), not Maestro                                 |
| Port          | 4230 (`apiMobileE2e`)                                                                 |
| Build prereq  | `helpers-config` + `api` built (or use existing workspace start after packages build) |
| Conflict      | Fail clearly if 4230 already in use; do not stealth-reuse 4030                        |

## Acceptance criteria

- `scripts/mobile/` (or Make) can start API on 4230 against test DB
- Health check (e.g. GET readiness/health) succeeds after start
- HOW-TO-RUN / TEST-ENV document the API terminal and stop procedure

## Verification

```bash
rg -n '4230|apiMobileE2e|mobile:e2e:api|mobile_e2e_api' scripts/mobile/ package.json makefiles/local/ apps/mobile/e2e/
```

## Depends on

- 5.17 / 076, 5.18 / 077

## Blocks

- 5.20, 6.11, 6.12
