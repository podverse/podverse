# 153-workflow-mobile-internal

**Master step:** 4.4
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

- Create `.github/workflows/mobile-internal.yml` on `develop` (and optionally `workflow_dispatch`).
- Triggers EAS build profile `internal` for iOS and/or Android (stub OK if secrets missing —
  document required secrets).
- **Non-blocking** relative to server CI (separate workflow file).

## Acceptance criteria

- Workflow file exists
- Does not `needs:` any publish-staging/main job
- Documents required EAS/Expo tokens in comments or runbook

## Web parity references

- [DOCS-MOBILE-VERSIONING-RELEASE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md) develop → internal

## Verification

```bash
test -f .github/workflows/mobile-internal.yml
rg -n 'eas|EXPO_TOKEN|internal' .github/workflows/mobile-internal.yml
```
