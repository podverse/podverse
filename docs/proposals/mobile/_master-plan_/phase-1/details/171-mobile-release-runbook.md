# 171-mobile-release-runbook

**Master step:** 4.22
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Create `docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md` consolidating accounts, EAS profiles,
  branch→channel map, secrets, store safety, OTA policy, beta onboarding links.

## Acceptance criteria

- Runbook exists and links Track 4 artifacts
- Store-safety: never overwrite Podverse Prod/Beta listings

## Verification

```bash
test -f docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md
```
