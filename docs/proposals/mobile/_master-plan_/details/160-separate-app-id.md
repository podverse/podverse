# 160-separate-app-id

**Master step:** 4.11
**Model (author + implement):** Opus 4.8
**Status:** ready

## Scope

- Confirm `app.config.ts` uses `com.podverse.app.next` for iOS `bundleIdentifier` and Android
  `package` (already set in Track 3).
- Document that CI/EAS profiles must target this id only until 4.25.

## Acceptance criteria

- Config and docs agree on `.next` suffix
- No workflow references prod bundle id

## Web parity references

- [apps/mobile/app.config.ts](/apps/mobile/app.config.ts)

## Verification

```bash
rg -n 'com\\.podverse\\.app\\.next' apps/mobile/app.config.ts
```
