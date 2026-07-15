# Mobile i18n screen localization (auth + nav product UI)

**Status:** completed (moved from active/)
**Trigger:** Auth/nav scaffold landed with English stubs. Track 17 i18n **runtime** is done
(17.0–17.13); screen-level adoption beyond HelloWorld is the remaining gap. Repo rule
**i18n-user-facing-strings** now requires localized product UI on web, management-web, and mobile.

## Goal

Convert all **product** user-facing strings in the current mobile auth + navigation shell to
i18n (`useTranslation` / `t()`), reusing `shared` / `consumer` catalog keys where possible and
adding only mobile-only chrome to the `mobile/` overlay. Wire account-locale override after
`/auth/me` hydrate.

## Context (already true)

- Runtime: i18next + expo-localization in `apps/mobile/src/i18n/`; `initializeI18n` blocks App
  until ready; `fallbackLng: en-US`.
- Catalog merge: `shared` → `consumer` → `mobile` → `apps/mobile/i18n/compiled/*.json`
  (gitignored; `prestart` / `npm run i18n:compile`).
- HelloWorld already uses `t('test.hello_world')` and `t('language.language')`.
- Consumer already has `authentication.*`, `features.*`, `settings.*`, `misc.loading`, etc.
- Maestro auth/nav flows select by `id:` (testID), not visible text — converting copy is safe if
  testIDs stay.
- `applyAccountLocaleOverride` exists but is not called from auth bootstrap/login hydrate.

## Locked decisions

| Item | Decision |
| ---- | -------- |
| Scope | Product UI only: Login, SignUp, HelloWorld auth CTAs, tab + stack **nav titles**. |
| Out of scope (this set) | Debug panel (`PlaybackEngineDebugPanel`), `...Placeholder` screen body text, full Track 16 settings locale picker, FCM locale sync. |
| Toggle / flag | **None.** Rely on i18next `fallbackLng: en-US`. Incremental conversion is safe. |
| Reuse first | Prefer existing consumer/shared keys (`authentication.*`, `features.*`, `misc.*`). Do not duplicate leaf paths in `mobile/`. |
| New keys | Mobile-only chrome (tabs Home / More / RSS / Downloads, missing stack titles, auth switch CTAs if not shared) → `packages/i18n-catalog/mobile/originals/en-US.json`. Shared auth copy → `consumer/originals/en-US.json`. |
| Account locale | After successful `/auth/me` (bootstrap + post-login), call `applyAccountLocaleOverride` with `account.account_settings?.account_settings_locale?.locale`. |
| E2E | Keep all existing `testID`s. Do not assert on localized English unless a flow already does (none for auth/nav today). |
| en-US wording | Prefer catalog en-US values for shared keys even if mobile stub phrasing differed slightly (e.g. "Login" vs "Log in") for cross-app consistency. |

## Out of scope

- Localizing every future screen as tracks land (rule + Track 17.14 track that discipline).
- Translating `es` / `fr` / `el-GR` originals by hand (use `npm run i18n:all` or CI after merge).
- Changing Maestro device matrix or report pipeline.

## Related

- Plan set execution: [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md), [COPY-PASTA.md](./COPY-PASTA.md)
- Master plan: Track 17 + new step **17.14** / detail `484-i18n-product-screen-localization`
- Rule: `.cursor/rules/i18n-user-facing-strings.mdc`
