# 462-settings-screen

**Master step:** 16.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Settings screen in More tab: locale picker, **theme selector**, playback defaults, notification
  toggles.
- Theme selector lists same ids as web: `dark`, `light`, `dracula`, `violet`, `ember`, `dawn`.
- Labels from i18n `settings.ui_theme.*` (not hardcoded English).
- On theme change: extend completed theme scaffold from steps **7.11–7.16** (update
  `ThemeProvider`, persist `uit`, update `StatusBar`, and reuse tokenized style semantics).
- Locale section cross-ref Track 17; playback/notification sections cross-ref account-settings API.

## Acceptance criteria

- Theme picker matches web `SettingsThemeSelector` theme id set
- Changing theme updates app colors immediately without restart
- Remote custom operator themes **out of scope** v1 (web-only)

## Web parity references

- [`apps/web/src/components/Settings/Panels/SettingsGeneral/SettingsThemeSelector.tsx`](/apps/web/src/components/Settings/Panels/SettingsGeneral/SettingsThemeSelector.tsx)
- [`apps/web/i18n/originals/en-US.json`](/apps/web/i18n/originals/en-US.json) — `settings.ui_theme`

## Verification

```bash
npm run start -w apps/mobile
grep -rq 'ALL_POSSIBLE_THEMES\|ui_theme' apps/mobile/src
```
