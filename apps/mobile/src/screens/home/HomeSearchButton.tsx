import { useTranslation } from 'react-i18next';

import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { navigateToSearchScreen } from '../../navigation';

/**
 * Home title-bar search. The press raises Search from the bottom over the tabs. A down caret
 * on Search dismisses it. A saved query and its rows are restored on the next open.
 */
export function HomeSearchButton() {
  const { t } = useTranslation();

  return (
    <HeaderBarAction
      accessibilityLabel={t('features.search.search')}
      icon="search"
      onPress={() => {
        navigateToSearchScreen({ autoFocus: true });
      }}
      testID="home-search"
    />
  );
}
