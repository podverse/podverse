# 482-i18n-mobile-catalog-import

**Master step:** 17.13
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Mobile bundles merged `shared + consumer + mobile` compiled JSON via i18next resources.
- Remove v1 copy step (17.2) from build path when this lands.
- Add `mobile/` overlay file for RN-only strings (may start as `{}`).

## Acceptance criteria

- i18next loads catalog merge output for all locales
- Key parity CI (17.7) passes
- No symlink to web i18n path

## Verification

```bash
npm run i18n:compile
npm run start -w apps/mobile
npm run i18n:validate
```
