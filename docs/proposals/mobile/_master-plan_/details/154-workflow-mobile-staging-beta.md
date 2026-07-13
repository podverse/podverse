# 154-workflow-mobile-staging-beta

**Master step:** 4.5
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

- Create `.github/workflows/mobile-staging-beta.yml` on `staging`.
- EAS profile `beta` → TestFlight / Play closed (or internal) testing for `.next` app only.

## Acceptance criteria

- Workflow exists; separate from server publish-staging
- Profile name matches 4.20

## Verification

```bash
test -f .github/workflows/mobile-staging-beta.yml
```
