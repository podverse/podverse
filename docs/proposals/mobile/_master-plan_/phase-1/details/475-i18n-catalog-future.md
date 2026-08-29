# 475-i18n-catalog-future

**Master step:** 17.6
**Model (author + implement):** Auto
**Status:** done

## Scope

- Document phased migration to `packages/i18n-catalog` (not doc-only — orchestrates 17.9–17.13).
- Layers: `shared/`, `consumer/`, `management/`, `mobile/` overlays.
- Single root `i18n:translate`, `i18n:compile`, `i18n:validate` targeting catalog + app outputs.
- Update [I18N.md](/docs/localization/I18N.md) and **i18n-catalog-layers** rule when phase 1 lands.

## Phases

1. Scaffold package (17.9)
2. Extract shared keys (17.10)
3. Migrate web consumer (17.11)
4. Migrate management (17.12)
5. Mobile catalog import (17.13)

## Acceptance criteria

- Phase plan documented in this detail file and monorepo target-structure §10
- No single monolithic JSON for all apps

## Web parity references

- [DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §10](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)

## Verification

```bash
test -f docs/localization/I18N.md
grep -q 'i18n-catalog' docs/localization/I18N.md
```
