# 172-ci-artifact-retention

**Master step:** 4.23
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Document retention for signed IPA/AAB and dSYM/mapping (EAS artifact links + optional GH
  Actions artifacts with retention days).

## Acceptance criteria

- Retention policy written in runbook
- Crash symbolication files called out

## Verification

```bash
rg -n 'dSYM|mapping|retention|artifact' docs/operations/mobile/
```
