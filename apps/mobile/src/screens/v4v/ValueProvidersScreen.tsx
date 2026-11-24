import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import type { MenuListItem, MenuListSection } from '../../components/screen/MenuListScreen';
import { MenuListScreen } from '../../components/screen/MenuListScreen';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { LoadingSection } from '../../components/state/LoadingSection';
import type { MoreStackParamList } from '../../navigation';
import { MORE_STACK_ROUTES } from '../../navigation';
import {
  getAlbyAccountSnapshot,
  loadAlbyConnection,
  subscribeAlbyConnection,
} from '../../v4v/alby';
import type { ValueProviderKey } from '../../v4v/valueProviders';
import { getValueProviderConnection, listValueProviders } from '../../v4v/valueProviders';

const openValueProvider = (
  navigation: NativeStackNavigationProp<MoreStackParamList>,
  key: ValueProviderKey
): void => {
  switch (key) {
    case 'alby':
      navigation.navigate(MORE_STACK_ROUTES.MoreValueProviderAlby);
      return;
  }
};

export function ValueProvidersScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const account = useSyncExternalStore(subscribeAlbyConnection, getAlbyAccountSnapshot);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadAlbyConnection().finally(() => {
      if (!cancelled) {
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo<MenuListSection[]>(() => {
    const connected: MenuListItem[] = [];
    const available: MenuListItem[] = [];

    for (const provider of listValueProviders()) {
      const connection = getValueProviderConnection(provider.key);
      const isConnected = connection.status === 'connected';
      const item: MenuListItem = {
        onPress: () => {
          openValueProvider(navigation, provider.key);
        },
        subtitle: isConnected ? t('v4v.status_connected') : t('v4v.status_not_connected'),
        testID: `value-provider-row-${provider.key}`,
        title: t(provider.titleKey),
      };

      if (isConnected) {
        connected.push(item);
      } else {
        available.push(item);
      }
    }

    const next: MenuListSection[] = [];
    if (connected.length > 0) {
      next.push({
        items: connected,
        key: 'connected',
        title: t('v4v.section_connected'),
      });
    }
    if (available.length > 0) {
      next.push({
        items: available,
        key: 'available',
        title: t('v4v.section_available'),
      });
    }
    return next;
  }, [account, navigation, t]);

  if (isLoading) {
    return (
      <MobileScreenContainer testID="value-providers-screen">
        <LoadingSection />
      </MobileScreenContainer>
    );
  }

  return <MenuListScreen sections={sections} testID="value-providers-screen" />;
}
