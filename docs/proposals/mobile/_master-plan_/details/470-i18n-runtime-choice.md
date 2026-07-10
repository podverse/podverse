# 470-i18n-runtime-choice

**Master step:** 17.1
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Adopt **i18next** + **expo-localization** for mobile (not next-intl).
- Add dependencies to `apps/mobile/package.json`; init i18n in app entry.
- Configure namespace/key separator to match web JSON top-level namespaces.
- Document choice in `APPS-MOBILE.md`.

## Acceptance criteria

- i18next initialized before first screen render
- Supported locales match `@podverse/helpers` `SUPPORTED_LOCALES`
- No next-intl imports in mobile

## Web parity references

- [`packages/helpers/src/lib/constants/locales.ts`](/packages/helpers/src/lib/constants/locales.ts)
- **i18n-catalog-layers** rule

## Verification

```bash
npm run start -w apps/mobile
grep -rq i18next apps/mobile/package.json
```
