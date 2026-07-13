# 165-branch-main-production

**Master step:** 4.16
**Model (author + implement):** Opus 4.8
**Status:** ready

## Scope

- Map `main` → production submit with human approval and store staged rollout notes.
- Emphasize: no crane-style retag; submit binary after approval.

## Acceptance criteria

- Mapping + approval gate documented
- Staged rollout called out for Play / App Store

## Verification

```bash
rg -n 'main|production|approval|staged rollout' .github/workflows/mobile-production-submit.yml docs/operations/mobile/
```
