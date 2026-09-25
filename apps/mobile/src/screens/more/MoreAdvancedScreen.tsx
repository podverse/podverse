import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { MenuListItem } from '../../components/screen/MenuListScreen';
import { MenuListScreen } from '../../components/screen/MenuListScreen';
import type { MoreStackParamList } from '../../navigation';
import { MORE_STACK_ROUTES } from '../../navigation';

/** Diagnostics and other tools most listeners never need, kept off the More root. */
export function MoreAdvancedScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();

  const items = useMemo<MenuListItem[]>(
    () => [
      {
        onPress: () => {
          navigation.navigate(MORE_STACK_ROUTES.MoreErrorLog);
        },
        subtitle: t('error_log.menu_subtitle'),
        testID: 'more-advanced-error-log',
        title: t('error_log.title'),
      },
    ],
    [navigation, t]
  );

  return <MenuListScreen sections={[{ items, key: 'advanced' }]} testID="more-advanced-screen" />;
}
