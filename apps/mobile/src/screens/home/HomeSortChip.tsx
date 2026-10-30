import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ListSortChip } from '../../components/form';
import type { HomeRangeOption, HomeSortOption } from '../../prefs/homeListPrefs';
import { HOME_RANGE_OPTIONS } from '../../prefs/homeListPrefs';
import { BROWSE_RANGE_LABEL_KEYS, BROWSE_RANGE_MENU_LABEL_KEYS } from '../browse/browseTypes';

const SORT_LABEL_KEYS: Record<HomeSortOption, string> = {
  alphabetical: 'filters.sort.a_z',
  popularity: 'features.browse.sort_popularity',
  recent: 'filters.sort.recent',
};

type HomeSortChipProps = {
  onRangeChange: (range: HomeRangeOption) => void;
  onSortChange: (sort: HomeSortOption) => void;
  options: readonly HomeSortOption[];
  range: HomeRangeOption;
  sort: HomeSortOption;
};

/**
 * Home list order. The face shows the current choice — the listen-count window while popularity
 * is selected, otherwise the order's name. Popularity opens a second sheet so the window is chosen
 * before the list is reordered.
 */
export function HomeSortChip({
  onRangeChange,
  onSortChange,
  options: sortOptions,
  range,
  sort,
}: HomeSortChipProps) {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      sortOptions.map((option) => ({
        label: t(SORT_LABEL_KEYS[option]),
        value: option,
      })),
    [sortOptions, t]
  );

  const rangeOptions = useMemo(
    () =>
      HOME_RANGE_OPTIONS.map((option) => ({
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
      rangeSort="popularity"
      sort={sort}
      testID="home-sort"
    />
  );
}
