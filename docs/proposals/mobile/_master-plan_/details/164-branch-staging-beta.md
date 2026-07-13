# 164-branch-staging-beta

**Master step:** 4.15
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

- Map `staging` → TestFlight external beta / Play closed testing via EAS `beta` profile.

## Acceptance criteria

- Documented mapping + workflow trigger on `staging`

## Verification

```bash
rg -n 'staging|beta|TestFlight' .github/workflows/mobile-staging-beta.yml docs/operations/mobile/
```
