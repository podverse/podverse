import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { MenuSelectChipOption } from '../../components/form';
import { MenuSelectChip } from '../../components/form';
import type { BrowseRangeOption } from './browseTypes';
import {
  BROWSE_RANGE_LABEL_KEYS,
  BROWSE_RANGE_MENU_LABEL_KEYS,
  BROWSE_RANGE_OPTIONS,
} from './browseTypes';

type BrowseSortChipProps = {
  onRangeChange: (range: BrowseRangeOption) => void;
  range: BrowseRangeOption;
};

/**
 * Popularity range for the Browse directory. The face shows the short range; the caret opens the
 * time-window choices.
 */
export function BrowseSortChip({ onRangeChange, range }: BrowseSortChipProps) {
  const { t } = useTranslation();

  const options = useMemo<MenuSelectChipOption<BrowseRangeOption>[]>(
    () =>
      BROWSE_RANGE_OPTIONS.map((option) => ({
        label: t(BROWSE_RANGE_MENU_LABEL_KEYS[option]),
        shortLabel: t(BROWSE_RANGE_LABEL_KEYS[option]),
        testID: `browse-sort-range-${option}`,
        value: option,
      })),
    [t]
  );

  return (
    <MenuSelectChip
      heading={t('filters.screen.sort_heading')}
      menuTitle={t('features.browse.sort_popularity')}
      onSelect={onRangeChange}
      options={options}
      testID="browse-sort"
      value={range}
    />
  );
}
