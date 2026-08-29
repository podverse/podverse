# 242-media-type-pref-sync

**Master step:** 8.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Persist the selected Home media type across launches using device prefs.
- Reuse web key semantics `preferred_media_type`; store via the mobile prefs module
  (`apps/mobile/src/prefs/`; unified store lands in Track 16.1, a scoped read/write is fine now).
- Hydrate selector default from the stored value on Home mount; fall back to `podcasts`.

## Acceptance criteria

- Changing media type persists and is restored after app relaunch
- Same key string/semantics as web `preferred_media_type` (device storage, not cookie transport)
- No hardcoded default scattered across screens — single source in the prefs read

## Web parity references

- [`apps/web/src/utils/localSettings/localSettings.ts`](/apps/web/src/utils/localSettings/localSettings.ts)
  — `preferred_media_type`
- Existing mobile pref pattern: [`apps/mobile/src/prefs/uiTheme.ts`](/apps/mobile/src/prefs/uiTheme.ts)

## Verification

```bash
grep -rq 'preferred_media_type' apps/mobile/src
npm run mobile:ios -- --device "iPhone 17 Pro"
```
