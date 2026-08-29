# 484-i18n-product-screen-localization

**Master step:** 17.14
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Localize **product** UI beyond Track 17.4’s “at least one screen” bar: Login, SignUp,
  HelloWorld auth CTAs, and tab/stack navigation titles.
- Reuse `packages/i18n-catalog` `shared` + `consumer` keys (`authentication.*`, `features.*`,
  `misc.*`, etc.); add mobile-only chrome to the `mobile/` overlay.
- Call `applyAccountLocaleOverride` after successful `/auth/me` (bootstrap + post-login).
- Keep Maestro `testID`s; leave `__DEV__` debug panels and temporary `...Placeholder` body copy
  until those screens are built.

## Acceptance criteria

- Auth + nav product chrome uses `useTranslation()` / `t()` with catalog keys
- No duplicate leaf paths across catalog layers
- Account locale override applied when authenticated settings include a locale
- Focused Maestro `auth-login`, `auth-logout`, `tab-switch-playback` still pass

## Web parity references

- **i18n-user-facing-strings** rule (all app surfaces)
- **shared-ui-i18n** / **i18n-catalog-layers** / **i18n-management**
- Consumer `authentication.*` keys used by web auth UI
- Runnable plan set: `.llm/plans/completed/phase-1/mobile-i18n-screen-localization/`

## Verification

```bash
npm run i18n:compile
npm run i18n:validate
npm run mobile:e2e:test -- auth-login,auth-logout,tab-switch-playback
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
