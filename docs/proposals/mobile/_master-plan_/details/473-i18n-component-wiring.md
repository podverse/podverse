# 473-i18n-component-wiring

**Master step:** 17.4
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

- Wire screens to use `useTranslation()` / `t()` for user-visible copy.
- Replace hardcoded English in scaffold screens (hello-world title may stay dev-only until i18n keys
  exist).
- No user-facing strings in `@podverse/design-tokens` or shared packages (**shared-ui-i18n** pattern
  for any future mobile UI package).

## Acceptance criteria

- At least one screen demonstrates localized string from JSON catalog
- Rich-text next-intl tags not used on mobile — plain strings or split keys

## Web parity references

- **shared-ui-i18n** rule

## Verification

```bash
grep -rq 'useTranslation\|i18n.t' apps/mobile/src
npm run start -w apps/mobile
```
