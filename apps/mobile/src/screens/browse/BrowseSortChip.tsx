import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ListSortChip } from '../../components/form';
import type { BrowseRangeOption, BrowseSortOption } from './browseTypes';
import {
  BROWSE_RANGE_LABEL_KEYS,
  BROWSE_RANGE_MENU_LABEL_KEYS,
  BROWSE_RANGE_OPTIONS,
  BROWSE_SORT_LABEL_KEYS,
  BROWSE_SORT_OPTIONS,
} from './browseTypes';

type BrowseSortChipProps = {
  onRangeChange: (range: BrowseRangeOption) => void;
  onSortChange: (sort: BrowseSortOption) => void;
  range: BrowseRangeOption;
  sort: BrowseSortOption;
};

/**
 * Browse directory order. Recent applies at once; Top opens the listen-count window choices
 * first, and the face shows that window while Top is selected.
 */
export function BrowseSortChip({ onRangeChange, onSortChange, range, sort }: BrowseSortChipProps) {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      BROWSE_SORT_OPTIONS.map((option) => ({
        label: t(BROWSE_SORT_LABEL_KEYS[option]),
        value: option,
      })),
    [t]
  );

  const rangeOptions = useMemo(
    () =>
      BROWSE_RANGE_OPTIONS.map((option) => ({
        label: t(BROWSE_RANGE_MENU_LABEL_KEYS[option]),
        shortLabel: t(BROWSE_RANGE_LABEL_KEYS[option]),
        value: option,
      })),
    [t]
  );

  return (
    <ListSortChip
      heading={t('filters.screen.sort_heading')}
      onRangeChange={onRangeChange}
      onSortChange={onSortChange}
      options={options}
      range={range}
      rangeHeading={t('filters.screen.range_heading')}
      rangeOptions={rangeOptions}
      rangeSort="top"
      sort={sort}
      testID="browse-sort"
    />
  );
}
