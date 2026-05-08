# 04 — Table family internal dedupe

## Goal

Remove the duplication between
[`TableWithFilter`](../../../../packages/ui/src/components/table/TableWithFilter/TableWithFilter.tsx)
and
[`ResourceTableWithFilter`](../../../../packages/ui/src/components/table/ResourceTableWithFilter/ResourceTableWithFilter.tsx),
and align the cookie helper API so `useTableFilterState` matches `TableWithSort`'s style.

## Why

Internal duplication makes future table changes touch two files. Today's overlaps:

1. `toSortColumns` in `ResourceTableWithFilter.tsx` (~lines 136–149) duplicates the
   inline `sortColumns` `useMemo` in `TableWithFilter.tsx` (~lines 123–133).
1. `filterColumnsForBar` in `ResourceTableWithFilter.tsx` (~lines 260–267) duplicates
   `filterColumns` in `TableWithFilter.tsx` (~lines 114–121).
1. The grouped-sections render path in `ResourceTableWithFilter.tsx` (~lines 416–434)
   re-emits the same `filterRow` + `TableFilterBar` + `trailingToolbar` JSX that
   `TableWithFilter` renders (~lines 171–189).
1. `useTableFilterState.ts` inlines `readBrowserCookie` → `mergeTableListStateCookie` →
   `writeBrowserCookie` while `TableWithSort` uses `mergeSortPrefsInBrowserCookie` from
   `browserCookies.ts`. Asymmetric API.

## Steps

### Step 1 — Extract column helpers

Add a new file (or append to an existing one) in
`packages/ui/src/components/table/Table/`:

- `tableWithFilterColumnsToSortColumns(columns: TableWithFilterColumn[], sortableColumnIds?: string[]): TableWithSortColumn[]`
- `computeFilterBarColumns(columns: TableWithFilterColumn[], filterableColumnIds?: string[]): TableWithFilterColumn[]`

Replace both inline definitions in `TableWithFilter.tsx` and the duplicates
(`toSortColumns`, `filterColumnsForBar`) in `ResourceTableWithFilter.tsx` with these
imports. Where `ResourceTableWithFilter` injects extra columns (e.g. select column for
bulk actions), preserve that by composing on top of the helper output.

### Step 2 — Make `TableWithFilter` parameterizable so grouped mode can reuse it

Add an optional prop to `TableWithFilterProps`:

- `bodyRender?: (args: { sortBy?: string; sortOrder?: TableSortableHeaderSortDirection; filterBag: ... }) => ReactNode;`

When provided, `TableWithFilter` renders `bodyRender(...)` between the filter row and
the page pagination instead of its default body. `ResourceTableWithFilter` then
composes `TableWithFilter` with `bodyRender` returning either the standard
`TableWithSort` body **or** the grouped-section bodies. This deletes the duplicated
filter-row JSX from `ResourceTableWithFilter`.

(If `bodyRender` is too generic, an alternative is `groupedSections?: GroupedSection[]`
on `TableWithFilter` itself — but that pulls grouping concerns into the simpler
component. Prefer `bodyRender` so `TableWithFilter` stays oblivious to grouping.)

### Step 3 — Add `mergeTableListStateInBrowserCookie`

In [`packages/ui/src/lib/cookies/browserCookies.ts`](../../../../packages/ui/src/lib/cookies/browserCookies.ts),
add a parallel helper to `mergeSortPrefsInBrowserCookie`:

```ts
export function mergeTableListStateInBrowserCookie(
  cookieName: string,
  listKey: string,
  patch: TableListStateEntry,
): void {
  const prev = readBrowserCookie(cookieName);
  const serialized = mergeTableListStateCookie(prev, listKey, patch);
  writeBrowserCookie(cookieName, serialized);
}
```

Update [`useTableFilterState.ts`](../../../../packages/ui/src/hooks/useTableFilterState.ts)
to call it (lines ~75–81 and any other read/merge/write triplets).

Export from `index.ts` near `mergeSortPrefsInBrowserCookie`.

## Tests

- Vitest unit tests for the two new column helpers — round-trip identity for
  identity-mapped inputs; verify `defaultSortOrder` / `sortKey` propagation.
- Vitest update for `useTableFilterState.test.tsx` — already covers the cookie write
  path; just confirm assertions still hold against the helper.
- Vitest unit test for `mergeTableListStateInBrowserCookie` (mock `document.cookie`).
- Update `ResourceTableWithFilter.test.tsx` and `TableWithFilter.test.tsx` if either
  references column derivation directly.

## Done when

- `ResourceTableWithFilter.tsx` no longer defines `toSortColumns` or
  `filterColumnsForBar`; both come from helpers.
- `ResourceTableWithFilter.tsx` does not re-emit a `<TableFilterBar />` row — it composes
  `TableWithFilter` (or whatever grouping abstraction is settled on).
- `useTableFilterState` does not call `readBrowserCookie` / `writeBrowserCookie`
  directly for list state.
- `npm run lint -w @podverse/ui`, `npm run build:packages`, and the package's vitest
  tests pass.
