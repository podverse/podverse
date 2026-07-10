# 234-theme-pref-uit-storage

**Master step:** 7.13
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Read/write `uit` (UI theme id) via device prefs module (`apps/mobile/src/prefs/` stub).
- On launch: hydrate `ThemeProvider` from stored `uit`; validate against `ALL_POSSIBLE_THEMES`.
- On theme change: persist `uit` immediately.
- Full prefs store (all `localSettings` keys) lands in Track 16.1 — this step may use AsyncStorage
  directly with a documented interface to replace later.

## Acceptance criteria

- Selected theme survives app restart
- Invalid stored value falls back to `dark`
- Pref key name `uit` matches web `localSettings` legend

## Web parity references

- [`apps/web/src/utils/localSettings/localSettings.ts`](/apps/web/src/utils/localSettings/localSettings.ts)
- [`apps/web/src/utils/localSettings/uiTheme.ts`](/apps/web/src/utils/localSettings/uiTheme.ts)

## Verification

```bash
grep -rq 'uit' apps/mobile/src
npm run start -w apps/mobile
```
