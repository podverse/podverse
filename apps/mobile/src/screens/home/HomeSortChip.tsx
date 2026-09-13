import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { MenuSelectChipOption } from '../../components/form';
import { MenuSelectChip } from '../../components/form';
import type { HomeSortOption } from '../../prefs/homeListPrefs';
import { HOME_SORT_OPTIONS } from '../../prefs/homeListPrefs';

const SORT_LABEL_KEYS: Record<HomeSortOption, string> = {
  alphabetical: 'filters.sort.a_z',
  popularity: 'features.browse.sort_popularity',
  recent: 'filters.sort.recent',
};

type HomeSortChipProps = {
  onSortChange: (sort: HomeSortOption) => void;
  sort: HomeSortOption;
};

/**
 * Home list order. The face shows the current choice; the caret opens A-Z, Recent, and Popularity.
 */
export function HomeSortChip({ onSortChange, sort }: HomeSortChipProps) {
  const { t } = useTranslation();

  const options = useMemo<MenuSelectChipOption<HomeSortOption>[]>(
    () =>
      HOME_SORT_OPTIONS.map((option) => ({
        label: t(SORT_LABEL_KEYS[option]),
        testID: `home-sort-${option}`,
        value: option,
      })),
    [t]
  );

  return (
    <MenuSelectChip
      heading={t('filters.screen.sort_heading')}
      menuTitle={t('filters.screen.sort_heading')}
      onSelect={onSortChange}
      options={options}
      testID="home-sort"
      value={sort}
    />
  );
}
