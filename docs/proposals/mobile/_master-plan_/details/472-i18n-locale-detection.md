# 472-i18n-locale-detection

**Master step:** 17.3
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

- Detect device locale via expo-localization on launch.
- Fall back to `DEFAULT_LOCALE` from `@podverse/helpers` when unsupported.
- When logged in, apply account-settings locale override from API (mirror web AccountProvider).

## Acceptance criteria

- App starts in device locale when supported
- Account locale wins over device when authenticated
- Locale change persists across sessions

## Web parity references

- [`apps/web/src/contexts/Account.tsx`](/apps/web/src/contexts/Account.tsx)
- [`packages/helpers/src/lib/constants/locales.ts`](/packages/helpers/src/lib/constants/locales.ts)

## Verification

```bash
npm run start -w apps/mobile
```
