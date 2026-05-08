# 03 — App migrations and keys

## management-web

**`i18n/originals/*.json` (all locales, same key order as en-US)**

- Under `common`, add (after `next` to match en-US insert order):
  - `paginationPrevButton`
  - `paginationNextButton`
  - `paginationPageOf` (ICU: `{currentPage}`, `{totalPages}`)
- Under `statsPage`, add:
  - `loadingChart`

**Callsites**

- [`UsersListPageClient.tsx`](../../../apps/management-web/src/app/(management)/users/UsersListPageClient.tsx) —
  pass new `Pagination` label props using `tc(...)`.
- [`StatsPageClient.tsx`](../../../apps/management-web/src/app/(management)/stats/StatsPageClient.tsx) —
  pass `Pagination` labels; add `loadingLabel` to every `StatsBarChart`.

## web

**`i18n/originals/*.json`**

- New top-level namespace `pagination` (before `language` to match file order):
  - `ariaPreviousPage`
  - `ariaNextPage`

**Callsite**

- [`apps/web/src/components/Pagination/Pagination.tsx`](../../../apps/web/src/components/Pagination/Pagination.tsx) —
  `useTranslations('pagination')` for `NavArrowButton` `aria-label` values.
