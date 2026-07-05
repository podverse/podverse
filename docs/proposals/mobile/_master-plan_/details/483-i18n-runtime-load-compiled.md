# 483-i18n-runtime-load-compiled

**Master step:** 17.0
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

- Fix web and management-web next-intl message loading to use **`i18n/compiled/`** output (merged
  originals + overrides), not raw `originals/` alone.
- Update `apps/web/src/i18n/request.ts`, `apps/web/src/app/layout.tsx`, `global-error.tsx`, and
  management-web equivalents.
- Ensure `prebuild`/`predev` compile step runs before dev/prod so compiled files exist locally.

## Acceptance criteria

- Non-empty human `overrides/` values appear in running app strings
- No regression in locale fallback (en-US base + locale merge)
- Document behavior in [I18N.md](/docs/localization/I18N.md)

## Web parity references

- [`apps/web/scripts/i18n/i18n-compile.ts`](/apps/web/scripts/i18n/i18n-compile.ts)
- [`docs/localization/I18N.md`](/docs/localization/I18N.md)

## Verification

```bash
npm run i18n:compile
npm run build -w apps/web
npm run build -w apps/management-web
```
