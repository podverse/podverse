**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 40 — Mobile shared two-step sort chip

## Rows

R15

## Runs after

none

## Goal

Pull the two-step sort chip out of `HomeSortChip` into a shared form component, so mobile Browse
(plan 41) can offer Recent and Top with the same chip instead of a second copy of the same logic.
Home keeps every testID, label, accessible name, and behavior it has today. This plan changes no
visible behavior.

The two-step chip is: a sort sheet; picking the ranked order opens a second sheet for the
listen-count window instead of applying at once; the chip face shows that window's short label
while the ranked order is selected, otherwise the order's name.

The web counterpart is `apps/web/src/components/ListSortChip/ListSortChip.tsx`, which takes the
same `rangeSort` idea (the one sort value that carries a range). The mobile component uses the
same name and prop idea.

## Current code

`apps/mobile/src/screens/home/HomeSortChip.tsx` holds the whole behavior:

- `MenuSelectChip` with `heading` and `menuTitle` both `t('filters.screen.sort_heading')`,
  `testID="home-sort"`, options from `SORT_LABEL_KEYS` with `testID: home-sort-${option}`.
- When `option === 'popularity' && sort === 'popularity'`, the option's `shortLabel` is the range
  short label (`BROWSE_RANGE_LABEL_KEYS[range]`), so the face reads Day / Week / Month / All-Time.
- `onSelect`: `'popularity'` sets `isRangeOpen` true and does not call `onSortChange`; any other
  value calls `onSortChange`.
- A `MoreMenu` with `testID="home-sort-range-menu"`, one section titled
  `t('filters.screen.range_heading')`, rows from `HOME_RANGE_OPTIONS` labelled
  `BROWSE_RANGE_MENU_LABEL_KEYS[option]`, `testID: home-sort-range-${option}`,
  `selected: sort === 'popularity' && option === range`, `onPress` calls `onRangeChange(option)`.
  `MoreMenu` closes itself (calls `onCancel`) before running an item's `onPress`.

## Change

### New `apps/mobile/src/components/form/ListSortChip.tsx`

Generic over the sort token and the range token. It takes already-localized strings (the
component does not import screen modules or catalog keys).

```typescript
export type ListSortChipOption<TSort extends string> = {
  /** Already-localized. */
  label: string;
  value: TSort;
};

export type ListSortChipRangeOption<TRange extends string> = {
  /** Already-localized menu row label, e.g. "All Time". */
  label: string;
  /** Already-localized chip face label while the ranked order is selected, e.g. "All-Time". */
  shortLabel: string;
  value: TRange;
};

export type ListSortChipProps<TSort extends string, TRange extends string> = {
  /** Names the control ("Sort"). Also the sort sheet title. */
  heading: string;
  onRangeChange: (range: TRange) => void;
  onSortChange: (sort: TSort) => void;
  options: readonly ListSortChipOption<TSort>[];
  range: TRange;
  /** Range sheet title ("Range"). */
  rangeHeading: string;
  rangeOptions: readonly ListSortChipRangeOption<TRange>[];
  /** The one sort value that is chosen through the range sheet. */
  rangeSort: TSort;
  sort: TSort;
  /**
   * Face `${testID}-button`, sort sheet `${testID}-menu`, sort rows `${testID}-<sort>`, range
   * sheet `${testID}-range-menu`, range rows `${testID}-range-<range>`.
   */
  testID: string;
};
```

Body, transcribed from `HomeSortChip` with `'popularity'` replaced by `rangeSort`:

- `useState<boolean>(false)` for `isRangeOpen`.
- `menuOptions` (`useMemo`): map `options` to `MenuSelectChipOption<TSort>` with `label`,
  `shortLabel` equal to the selected range's `shortLabel` only when
  `option.value === rangeSort && sort === rangeSort` (otherwise `undefined`),
  `testID: \`${testID}-${option.value}\``, `value`.
- `rangeSections` (`useMemo`): one `MoreMenuSection` with `key: 'range'`,
  `title: rangeHeading`, items from `rangeOptions` with `key: option.value`,
  `label: option.label`, `onPress: () => { onRangeChange(option.value); }`,
  `selected: sort === rangeSort && option.value === range`,
  `testID: \`${testID}-range-${option.value}\``.
- Render `MenuSelectChip` with `heading={heading}`, `menuTitle={heading}`, `options`,
  `testID={testID}`, `value={sort}`, and `onSelect` that opens the range sheet for `rangeSort`
  and calls `onSortChange` otherwise. Then `MoreMenu` with `cancelLabel={t('misc.cancel')}`,
  `onCancel` closing the range sheet, `sections={rangeSections}`,
  `testID={\`${testID}-range-menu\`}`, `visible={isRangeOpen}`. `useTranslation` stays for the
  shared `misc.cancel` string, the same way `MenuSelectChip` already reads it.
- Doc comment on the component: what the two-step chip does (the paragraph in § Goal, in
  present tense). No mention of Home or Browse.

Import `MoreMenu` and its types from `../primitives` and `MenuSelectChip` /
`MenuSelectChipOption` from `./MenuSelectChip`, matching how `MenuSelectChip.tsx` imports. Type
imports on their own `import type` lines.

### `apps/mobile/src/components/form/index.ts`

The file is alphabetical (`FormActions`, `FormField`, `ListFilterField`, `MenuSelectChip`, …).
Insert directly after the `ListFilterField` export pair and before `MenuSelectChip`:

```typescript
export { ListSortChip } from './ListSortChip';
export type {
  ListSortChipOption,
  ListSortChipProps,
  ListSortChipRangeOption,
} from './ListSortChip';
```

### `apps/mobile/src/screens/home/HomeSortChip.tsx`

Becomes a thin wrapper that builds localized options and renders `ListSortChip`:

- Keep `SORT_LABEL_KEYS`, the props type, and the doc comment (it still describes Home's chip).
- `options` (`useMemo` over `options` prop and `t`): `{ label: t(SORT_LABEL_KEYS[option]), value: option }`.
- `rangeOptions` (`useMemo` over `t`): `HOME_RANGE_OPTIONS.map((option) => ({ label:
  t(BROWSE_RANGE_MENU_LABEL_KEYS[option]), shortLabel: t(BROWSE_RANGE_LABEL_KEYS[option]),
  value: option }))`.
- Render `<ListSortChip heading={t('filters.screen.sort_heading')} onRangeChange={onRangeChange}
  onSortChange={onSortChange} options={options} range={range}
  rangeHeading={t('filters.screen.range_heading')} rangeOptions={rangeOptions}
  rangeSort="popularity" sort={sort} testID="home-sort" />`.
- Drop the now-unused imports (`useState`, `MoreMenu`, `MoreMenuItem`, `MoreMenuSection`,
  `MenuSelectChip`, `MenuSelectChipOption`).

What must stay byte-identical for Home: testIDs `home-sort-button`, `home-sort-menu`,
`home-sort-alphabetical`, `home-sort-recent`, `home-sort-popularity`, `home-sort-range-menu`,
`home-sort-range-<range>`, `home-sort-range-menu-cancel`; the accessible name
`Sort: <face>` (from `MenuSelectChip`); the sort sheet title "Sort"; the range sheet title
"Range"; the face showing the range short label while Popularity is selected.

`HomeScreen.tsx` does not change: `HomeSortChip`'s props stay the same.

## Files

apps/mobile/src/components/form/ListSortChip.tsx
apps/mobile/src/components/form/index.ts
apps/mobile/src/screens/home/HomeSortChip.tsx

## Tests

No new test. The component is presentation over `MenuSelectChip` and `MoreMenu`, and the
mobile vitest suite runs in node without a renderer (**mobile-test-economics**: the cheapest
rung that holds "Home's sort chip still works" is the existing flow).
`apps/mobile/e2e/home.yaml` already covers every Home testID listed above, the
`Sort: A-Z` / `Sort: Recent` accessible names, and the Popularity → range sheet step; it must
pass unchanged.

## Release scratchpad

none
