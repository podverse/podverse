# 450-ios-associated-domains

**Master step:** 15.1
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add iOS **Associated Domains** capability for Podverse web URLs so universal links open the app.
- Add `applinks:podverse.fm` (and any env/staging domain) to
  `apps/mobile/ios/PodverseNext/PodverseNext.entitlements` and wire it through an Expo config plugin
  so `mobile:prebuild` stays correct (mirror the CarPlay plugin pattern).
- Domain host derived from mobile web-base config (avoid hardcoding when a config value exists).

## Acceptance criteria

- `applinks:` entry present in entitlements and reproduced by `expo prebuild` (config plugin).
- Existing CarPlay + App Group entitlements preserved.
- No regression to custom-scheme URL types (`podverse-next`, `com.podverse.app.next`).

## Web parity references

- `apps/mobile/ios/PodverseNext/PodverseNext.entitlements` (current CarPlay + App Group).
- `apps/mobile/plugins/withPodverseCarPlay.js` (config-plugin pattern to follow).
- `apps/mobile/app.config.ts` (bundle id `com.podverse.app.next`, scheme).

## Operator-only

- Enable **Associated Domains** on the App ID (Apple Developer).
- Host `apple-app-site-association` at `https://podverse.fm/.well-known/apple-app-site-association`
  (web infra) with the app's Team ID + bundle id and allowed paths.

## Verification

```bash
grep -q "applinks:" apps/mobile/ios/PodverseNext/PodverseNext.entitlements
grep -rq "applinks" apps/mobile/plugins
```
