# 471-i18n-copy-originals-v1

**Master step:** 17.2
**Model (author + implement):** Auto
**Status:** done

## Scope

- **v1 spike:** copy web `i18n/originals/*.json` into `apps/mobile/i18n/originals/` (or import path
  documented for i18next).
- Locales: en-US, es, fr, el-GR.
- Superseded by step 17.13 after `packages/i18n-catalog` migration — keep until catalog lands.

## Acceptance criteria

- Mobile bundles consumer strings for all four locales
- Copy script or documented refresh step in `APPS-MOBILE.md`
- No symlink to web path (CI fragile)

## Web parity references

- [`apps/web/i18n/originals/en-US.json`](/apps/web/i18n/originals/en-US.json)

## Verification

```bash
test -f apps/mobile/i18n/originals/en-US.json
npm run start -w apps/mobile
```
