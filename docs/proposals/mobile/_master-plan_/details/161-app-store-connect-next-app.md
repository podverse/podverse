# 161-app-store-connect-next-app

**Master step:** 4.12
**Model (author + implement):** Opus 4.8
**Status:** ready

## Scope

- Operator checklist: create separate App Store Connect app for Podverse Next / `.next` bundle id.
- Do **not** reuse existing Podverse production listing.
- Document steps in runbook (manual ASC UI — agent cannot create ASC apps).

## Acceptance criteria

- Runbook section with ASC checklist
- Explicit store-safety warning

## Verification

```bash
rg -n 'App Store Connect|\\.next|store safety' docs/operations/mobile/
```
