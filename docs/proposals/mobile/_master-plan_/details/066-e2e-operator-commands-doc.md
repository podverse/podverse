# 066-e2e-operator-commands-doc

**Master step:** 5.7
**Model (author + implement):** Auto
**Status:** ready

## Scope

- Document operator E2E commands in `apps/mobile/APPS-MOBILE.md` (from monorepo root).
- Include device names, report path, Maestro prerequisites.

## Acceptance criteria

- APPS-MOBILE has a Testing / E2E section with copy-pasteable commands
- Explicit: not Playwright / not `make e2e_*`

## Verification

```bash
rg -n 'mobile_e2e|Maestro|mobile-e2e-reports' apps/mobile/APPS-MOBILE.md
```
