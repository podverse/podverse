# 071-e2e-spec-naming-convention

**Master step:** 5.12
**Model (author + implement):** Auto
**Status:** done

## Scope

- Standardize Maestro flow names: `apps/mobile/e2e/<area>.yaml` (kebab-case area).
- Document in e2e README; Detox `.e2e.ts` not used.

## Acceptance criteria

- Naming convention written once and referenced by hello-world flow
- SPEC Make variable matches basename without `.yaml`

## Verification

```bash
rg -n 'e2e/<area>|\\.yaml|SPEC=' apps/mobile/e2e/README.md apps/mobile/APPS-MOBILE.md
```
