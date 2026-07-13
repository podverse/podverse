# 166-monotonic-build-numbers

**Master step:** 4.17
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

- Drive iOS `CFBundleVersion` and Android `versionCode` from CI/EAS build counter (monotonic).
- Marketing version stays monorepo `X.Y.Z` (see 4.18).

## Acceptance criteria

- Documented mechanism (EAS `autoIncrement` or GH run number)
- Never reset build numbers for `.next` app

## Web parity references

- [DOCS-MOBILE-VERSIONING-RELEASE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md)

## Verification

```bash
rg -n 'autoIncrement|versionCode|CFBundleVersion|buildNumber' apps/mobile/ docs/operations/mobile/ eas.json 2>/dev/null | head
```
