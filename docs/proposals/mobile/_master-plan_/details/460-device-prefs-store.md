# 460-device-prefs-store

**Master step:** 16.1
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

- Implement device prefs store (MMKV preferred; AsyncStorage acceptable v1) mirroring web
  `localSettings` keys.
- Required keys include **`uit`** (UI theme), `preferred_media_type`, auto-queue shuffle/repeat
  (`aqc.rd`, `aqc.rp`), and other keys from
  [`apps/web/src/utils/localSettings/localSettings.ts`](/apps/web/src/utils/localSettings/localSettings.ts).
- Replace Track 7.13 stub with unified store API (`getPref`, `setPref`, `hydratePrefs`).
- Build on completed Track 7 theme foundations from steps **7.11–7.16** (`ThemeProvider`,
  design-tokens mapping, `uit` stub persistence, and tokenized scaffold styles).
- Typed pref keys; validate enum prefs against allowed values.

## Acceptance criteria

- Single prefs module used by theme, media-type, and auto-queue features
- `uit` read/write integrated with `ThemeProvider`
- Same key strings/semantics as web cookie JSON (not cookie transport)

## Web parity references

- [`apps/web/src/utils/localSettings/localSettings.ts`](/apps/web/src/utils/localSettings/localSettings.ts)
- [`DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md` §8](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md)

## Verification

```bash
grep -rq 'uit' apps/mobile/src/prefs
npm run start -w apps/mobile
```
