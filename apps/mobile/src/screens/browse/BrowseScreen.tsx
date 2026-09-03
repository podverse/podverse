import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { MenuListScreen } from '../../components/screen/MenuListScreen';
import type { MobileTabParamList } from '../../navigation';

/**
 * Public directory hub. Rows jump to Search until dedicated directory lists land on this stack.
 */
export function BrowseScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<BottomTabNavigationProp<MobileTabParamList>>();

  const openSearch = () => {
    navigation.navigate('Search');
  };

  return (
    <MenuListScreen
      items={[
        {
          onPress: openSearch,
          testID: 'browse-nav-podcasts',
          title: t('media.podcast.podcasts'),
        },
        {
          onPress: openSearch,
          testID: 'browse-nav-videos',
          title: t('media.video.videos'),
        },
        {
          onPress: openSearch,
          testID: 'browse-nav-music',
          title: t('media.music.music'),
        },
      ]}
      testID="browse-screen"
    />
  );
}
