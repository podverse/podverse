import { useTranslation } from 'react-i18next';

import { SortPill } from '../../components/form/SortPill';
import type { HomeSortOption } from '../../prefs/homeListPrefs';

type HomeSortRowProps = {
  onPress: () => void;
  sort: HomeSortOption;
};

const SORT_LABEL_KEYS: Record<HomeSortOption, string> = {
  alphabetical: 'filters.sort.a_z',
  recent: 'filters.sort.recent',
};

/**
 * Opens Home's filter and sort choices, showing the current order on its face.
 *
 * The pill navigates rather than disclosing, because Home's choices are a screen: two controls
 * scoped by media type, which is more than belongs under a list header.
 */
export function HomeSortRow({ onPress, sort }: HomeSortRowProps) {
  const { t } = useTranslation();

  return (
    <SortPill
      heading={t('filters.screen.sort_heading')}
      onPress={onPress}
      testID="home-sort-button"
      value={t(SORT_LABEL_KEYS[sort])}
    />
  );
}
