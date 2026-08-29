# 268-search-filters-sort

**Master step:** 9.9
**Model (author + implement):** Codex 5.3
**Status:** done — superseded by
[709-search-tab-web-alignment](/docs/proposals/mobile/_master-plan_/phase-2/details/709-search-tab-web-alignment.md)

The medium and sort chips this step added were removed in Phase 2: web `/search` has neither, and
Podcast Index decides what comes back and in what order, so the controls could only reorder what
that API already chose. The scope below is kept as the record of what shipped in Phase 1.

## Scope

- Search filters and sort controls matching web search behavior (result type / sort defaults).
- Reuse the media-type selector pattern (8.2) or a filter control where web uses one.
- Persist sort default consistent with web (see sort-prefs conventions) where applicable.

## Acceptance criteria

- Filter/sort options and defaults match web search
- Changing filter/sort re-queries and updates the results list
- Tokenized controls; localized labels

## Web parity references

- [`apps/web/src/app/search/SearchPageListHeader.tsx`](/apps/web/src/app/search/SearchPageListHeader.tsx),
  [`apps/web/src/components/List/SearchResults`](/apps/web/src/components/List/SearchResults)
- Sort conventions: **table-sort-defaults** / **sort-prefs-cookie-by-path** skills (semantics)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- search
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
