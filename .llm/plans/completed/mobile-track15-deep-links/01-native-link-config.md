# 01 — Native universal/App Links config (15.1, 15.2)

**Cursor model:** Codex 5.3
**Details:** 450, 451
**Ship bar:** Native config + Expo plugin/managed config; no JS routing yet (that is 02).

## Goal

Enable iOS Associated Domains and Android App Links for `https://podverse.fm` (+ env host), wired
through Expo config so managed prebuild stays correct, without breaking existing custom schemes.

## Context (read first)

- Details 450 (iOS), 451 (Android).
- `apps/mobile/ios/PodverseNext/PodverseNext.entitlements` (CarPlay + App Group present).
- `apps/mobile/android/app/src/main/AndroidManifest.xml` (custom-scheme intent filters).
- `apps/mobile/plugins/withPodverseCarPlay.js` (config-plugin pattern to mirror).
- `apps/mobile/app.config.ts` (scheme, bundle id, applicationId `com.podverse.app.next`).
- Skills: **mobile-expo-monorepo**, **mobile-ios-simulator**. Rule: **mobile-react-native**.

## Tasks

1. **iOS (15.1)** — Add `applinks:podverse.fm` (+ env/staging) to entitlements and via a config
   plugin so `expo prebuild` reproduces it; preserve CarPlay + App Group entitlements.
2. **Android (15.2)** — Add `autoVerify` `VIEW` intent filter for `https` host `podverse.fm`
   (paths from 452) via `app.config.ts`/plugin; keep custom-scheme filters.
3. Domain host from mobile web-base config where available (avoid hardcoding).
4. Mark **15.1, 15.2** `done` in master plan Tracks + Appendix C; detail 450/451 headers `done`.

## Out of scope

- JS `getStateFromPath` routing (02).
- Hosting `apple-app-site-association` / `assetlinks.json` (operator + web infra).

## Acceptance

- Entitlements + Android manifest gain the link config, reproduced by prebuild.
- Existing custom schemes + CarPlay entitlements intact.
