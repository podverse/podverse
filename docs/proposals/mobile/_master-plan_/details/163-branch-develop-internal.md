# 163-branch-develop-internal

**Master step:** 4.14
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Map `develop` → internal distribution only (EAS `internal` / TestFlight Internal / Play internal).
- Document in runbook + workflow comments.

## Acceptance criteria

- Mapping table matches DOCS-MOBILE-VERSIONING-RELEASE
- Workflow trigger matches

## Verification

```bash
rg -n 'develop|internal' .github/workflows/mobile-internal.yml docs/operations/mobile/
```
