# 05 — Subscribed list-page header hook

## Goal

Reduce the four near-identical list-page header components to thin shells by extracting
their type guards, handler bodies, and `buttonsNode` JSX into one app-local hook in
`apps/web`.

## Why

[`PodcastsPageHeader.tsx`](../../../../apps/web/src/app/podcasts/PodcastsPageHeader.tsx),
[`EpisodesPageHeader.tsx`](../../../../apps/web/src/app/episodes/EpisodesPageHeader.tsx),
[`ClipsPageHeader.tsx`](../../../../apps/web/src/app/clips/ClipsPageHeader.tsx), and
[`LivestreamsPageHeader.tsx`](../../../../apps/web/src/app/podcasts/livestreams/LivestreamsPageHeader.tsx)
each repeat ~70 lines of:

- Three type guards (`is*Type`, `is*Sort`, `isStatsRange`).
- Three handlers (`handleTypeChange`, `handleSortChange`, `handleRangeChange`) — only
  the default subscribed sort differs (`a_z` vs `recent`) and which sort union is used
  (`Full` vs `Partial`).
- The same `buttonsNode` JSX — three `Dropdown`s + `ViewSelector`.

This is app-local i18n + context wiring, so it stays in `apps/web` per
[`app-local-ui-wrappers.mdc`](../../../../.cursor/rules/app-local-ui-wrappers.mdc).

## Design

### Hook: `useSubscribedListHeader`

- Location: `apps/web/src/hooks/useSubscribedListHeader.ts`
  (or `apps/web/src/app/_subscribedListHeader.ts` if hooks dir is preferred to stay
  framework-only).

- Generic over the sort union:

  ```ts
  export function useSubscribedListHeader<TSort extends string>(args: {
    type: QueryParamsSubscribedType;
    sort: TSort;
    range: QueryParamsStatsRange | null;
    typeValues: readonly QueryParamsSubscribedType[];
    sortValues: readonly TSort[];
    defaultGlobalSort: TSort;
    defaultSubscribedSort: TSort;
    medium: 'av' | 'music';
    setFilterParams: (next: { ... }) => void;
    setShowCategoriesModal?: (open: boolean) => void;
    typeMenuItems: DropdownOption[];
    sortMenuItems: DropdownOption[];
    rangeMenuItems: DropdownOption[];
    showRangeDropdown: boolean;
  }): { buttonsNode: ReactNode };
  ```

- Internally builds the three guard predicates from the supplied arrays, the three
  handler closures, and the `buttonsNode` JSX (3 dropdowns + `ViewSelector`).
- `ViewSelector` import stays inside the hook so callers don't need to wire it.

### Page header files

Reduce each from ~125 lines to ~25 lines:

```ts
export const PodcastsPageHeader: React.FC = () => {
  const { filterParams, setFilterParams, setShowCategoriesModal } =
    usePodcastsPageContext();
  const tMedia = useTranslations('media');
  const tFilters = useTranslations('filters');
  const tCategories = useTranslations('categories');
  const dropdown = getPodcastsPageDropdownConfig({ ...filterParams, tFilters });
  const { buttonsNode } = useSubscribedListHeader({
    /* ...adapted args... */
  });
  const headerTitle = filterParams.category
    ? `${tMedia('podcast.podcasts')} > ${tCategories(filterParams.category)}`
    : tMedia('podcast.podcasts');
  return <MainHeader title={headerTitle} buttonsNode={buttonsNode} />;
};
```

(Pair this with `02-delete-common-list-page-header.md` so the JSX uses `MainHeader`
directly.)

### Compatibility note

`ClipsPageHeader.tsx` already imports `getEpisodesPageDropdownConfig` from
`../episodes/`. After plan `06` lands a single factory, those args come from the
factory's typed return shape. Until then, this plan's hook accepts whatever shape the
existing `getXPageDropdownConfig` returns.

## Tests

- Vitest unit test (RTL): mount the hook in a small probe component; click each
  dropdown change handler and assert `setFilterParams` is called with the expected
  shape (asserts default subscribed sort wiring).

## Done when

- The four affected `*PageHeader.tsx` files have ≤30 lines each.
- The hook lives in one place and is consumed by all four.
- `npm run lint -w apps/web` and `npm run build -w apps/web` pass.
- Behavior is unchanged — verified by `10-verification.md`.
