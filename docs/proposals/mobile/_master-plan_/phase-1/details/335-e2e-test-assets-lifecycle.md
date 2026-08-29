# 335-e2e-test-assets-lifecycle

**Master step:** 5.21
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Provide a **long-lived** `podverse-test-assets` process for Maestro (same server web Playwright
  uses on port **2111**), not a mobile-only asset stack.
- Scripts/Make: start / stop / health wrapping `npm run start -w podverse-test-assets`.
- Do not attach asset lifecycle to UI-only `mobile:e2e:test` by default.
- Document an operator leave-running tab alongside Metro / E2E API.

## Locked decisions

| Item          | Decision                                                     |
| ------------- | ------------------------------------------------------------ |
| Process owner | Script/Make (operator or foreground npm), not Maestro        |
| Port          | **2111** (same as web `playwright.e2e-webservers.ts`)        |
| Package       | `podverse-test-assets` / `tools/test-assets`                 |
| Conflict      | Fail clearly if 2111 already in use by a non-managed process |

## Acceptance criteria

- `scripts/mobile/e2e-test-assets.sh` can start/stop/health-check assets on 2111
- Root npm + Make wrappers exist (`mobile:e2e:test-assets*`, `mobile_e2e_test_assets*`)
- HOW-TO-RUN / TEST-ENV / terminals.json document the leave-running tab

## Verification

```bash
rg -n '2111|e2e-test-assets|mobile:e2e:test-assets' scripts/mobile/ package.json makefiles/local/ apps/mobile/e2e/ .vscode/terminals.json
```

## Depends on

- 5.18 / 077 (shared seed URLs already point at 2111)

## Blocks

- 5.22 / 336, 9.29 / 288
