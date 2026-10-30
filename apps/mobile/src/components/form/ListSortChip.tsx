import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { MoreMenuSection } from '../primitives';
import { MoreMenu } from '../primitives';
import type { MenuSelectChipOption } from './MenuSelectChip';
import { MenuSelectChip } from './MenuSelectChip';

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

/**
 * A sort sheet. Picking the ranked order opens a second sheet for the listen-count window
 * instead of applying at once. The chip face shows that window's short label while the ranked
 * order is selected, otherwise the order's name.
 */
export function ListSortChip<TSort extends string, TRange extends string>({
  heading,
  onRangeChange,
  onSortChange,
  options,
  range,
  rangeHeading,
  rangeOptions,
  rangeSort,
  sort,
  testID,
}: ListSortChipProps<TSort, TRange>) {
  const { t } = useTranslation();
  const [isRangeOpen, setIsRangeOpen] = useState<boolean>(false);

  const menuOptions = useMemo<MenuSelectChipOption<TSort>[]>(() => {
    const rangeShortLabel = rangeOptions.find(
      (rangeOption) => rangeOption.value === range
    )?.shortLabel;

    return options.map((option) => ({
      label: option.label,
      shortLabel: option.value === rangeSort && sort === rangeSort ? rangeShortLabel : undefined,
      testID: `${testID}-${option.value}`,
      value: option.value,
    }));
  }, [options, range, rangeOptions, rangeSort, sort, testID]);

  const rangeSections = useMemo<MoreMenuSection[]>(
    () => [
      {
        items: rangeOptions.map((option) => ({
          key: option.value,
          label: option.label,
          onPress: () => {
            onRangeChange(option.value);
          },
          selected: sort === rangeSort && option.value === range,
          testID: `${testID}-range-${option.value}`,
        })),
        key: 'range',
        title: rangeHeading,
      },
    ],
    [onRangeChange, range, rangeHeading, rangeOptions, rangeSort, sort, testID]
  );

  return (
    <>
      <MenuSelectChip
        heading={heading}
        menuTitle={heading}
        onSelect={(nextSort) => {
          if (nextSort === rangeSort) {
            setIsRangeOpen(true);
            return;
          }
          onSortChange(nextSort);
        }}
        options={menuOptions}
        testID={testID}
        value={sort}
      />
      <MoreMenu
        cancelLabel={t('misc.cancel')}
        onCancel={() => {
          setIsRangeOpen(false);
        }}
        sections={rangeSections}
        testID={`${testID}-range-menu`}
        visible={isRangeOpen}
      />
    </>
  );
}
