import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { MenuSelectChipOption } from '../../components/form';
import { MenuSelectChip } from '../../components/form';
import type { MoreMenuItem, MoreMenuSection } from '../../components/primitives';
import { MoreMenu } from '../../components/primitives';
import type { HomeRangeOption, HomeSortOption } from '../../prefs/homeListPrefs';
import { HOME_RANGE_OPTIONS, HOME_SORT_OPTIONS } from '../../prefs/homeListPrefs';
import { BROWSE_RANGE_LABEL_KEYS, BROWSE_RANGE_MENU_LABEL_KEYS } from '../browse/browseTypes';

const SORT_LABEL_KEYS: Record<HomeSortOption, string> = {
  alphabetical: 'filters.sort.a_z',
  popularity: 'features.browse.sort_popularity',
  recent: 'filters.sort.recent',
};

type HomeSortChipProps = {
  onRangeChange: (range: HomeRangeOption) => void;
  onSortChange: (sort: HomeSortOption) => void;
  range: HomeRangeOption;
  sort: HomeSortOption;
};

/**
 * Home list order. The face shows the current choice — the listen-count window while popularity
 * is selected, otherwise A-Z or Recent. Popularity opens a second sheet so the window is chosen
 * before the list is reordered.
 */
export function HomeSortChip({ onRangeChange, onSortChange, range, sort }: HomeSortChipProps) {
  const { t } = useTranslation();
  const [isRangeOpen, setIsRangeOpen] = useState<boolean>(false);

  const options = useMemo<MenuSelectChipOption<HomeSortOption>[]>(
    () =>
      HOME_SORT_OPTIONS.map((option) => ({
        label: t(SORT_LABEL_KEYS[option]),
        shortLabel:
          option === 'popularity' && sort === 'popularity'
            ? t(BROWSE_RANGE_LABEL_KEYS[range])
            : undefined,
        testID: `home-sort-${option}`,
        value: option,
      })),
    [range, sort, t]
  );

  const rangeSections = useMemo<MoreMenuSection[]>(() => {
    const items: MoreMenuItem[] = HOME_RANGE_OPTIONS.map((option) => ({
      key: option,
      label: t(BROWSE_RANGE_MENU_LABEL_KEYS[option]),
      onPress: () => {
        onRangeChange(option);
      },
      selected: sort === 'popularity' && option === range,
      testID: `home-sort-range-${option}`,
    }));

    return [{ items, key: 'range', title: t('filters.screen.range_heading') }];
  }, [onRangeChange, range, sort, t]);

  return (
    <>
      <MenuSelectChip
        heading={t('filters.screen.sort_heading')}
        menuTitle={t('filters.screen.sort_heading')}
        onSelect={(nextSort) => {
          if (nextSort === 'popularity') {
            setIsRangeOpen(true);
            return;
          }
          onSortChange(nextSort);
        }}
        options={options}
        testID="home-sort"
        value={sort}
      />
      <MoreMenu
        cancelLabel={t('misc.cancel')}
        onCancel={() => {
          setIsRangeOpen(false);
        }}
        sections={rangeSections}
        testID="home-sort-range-menu"
        visible={isRangeOpen}
      />
    </>
  );
}
