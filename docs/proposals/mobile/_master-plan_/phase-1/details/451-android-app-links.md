# 451-android-app-links

**Master step:** 15.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add Android **App Links** (`android:autoVerify="true"`) intent filters for the same
  `https://podverse.fm` URL patterns as iOS universal links, alongside the existing custom-scheme
  intent filters (`podverse-next`, `com.podverse.app.next`, `exp+podverse-next`).
- Wire via Expo config (intent filters in `app.config.ts` / a config plugin) so managed prebuild
  regenerates the manifest correctly; do not hand-edit generated `AndroidManifest.xml` only.

## Acceptance criteria

- `MainActivity` gains an `autoVerify` `VIEW` intent filter for `https` host `podverse.fm`
  (+ env/staging host if applicable) with the path patterns from 452.
- Existing custom-scheme intent filters remain intact.
- `applicationId` unchanged (`com.podverse.app.next`).

## Web parity references

- `apps/mobile/android/app/src/main/AndroidManifest.xml` (current intent filters).
- `apps/mobile/app.config.ts` (Android config, applicationId).
- iOS twin: detail 450.

## Operator-only

- Play Console App Links verification.
- Host `/.well-known/assetlinks.json` with the release signing cert SHA-256 (web infra).

## Verification

```bash
grep -rq "autoVerify" apps/mobile/android apps/mobile/app.config.ts
```
