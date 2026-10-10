import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { isPopularityTrackingAllowed } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import type { MenuListItem } from '../../components/screen/MenuListScreen';
import { MenuListScreen } from '../../components/screen/MenuListScreen';
import type { MoreStackParamList } from '../../navigation';
import { MORE_STACK_ROUTES } from '../../navigation';
import { getPopularityTrackingCurrentVersion } from '../../popularityTracking/popularityTrackingGate';

export function MoreSettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { account } = useAuth();
  const popularityAllowed = isPopularityTrackingAllowed(
    account?.account_settings,
    getPopularityTrackingCurrentVersion()
  );
  const agreedVersion = account?.account_terms_acceptance?.terms_version;
  const termsSubtitle =
    agreedVersion !== undefined && agreedVersion !== ''
      ? t('terms_acceptance.agreement_date', { agreement_date: agreedVersion })
      : '';

  const items = useMemo<MenuListItem[]>(
    () => [
      {
        onPress: () => {
          navigation.navigate(MORE_STACK_ROUTES.MoreSettingsAppearance);
        },
        subtitle: t('settings.groups.appearance_description'),
        testID: 'more-settings-appearance',
        title: t('settings.groups.appearance'),
      },
      {
        onPress: () => {
          navigation.navigate(MORE_STACK_ROUTES.MoreSettingsTabBar);
        },
        subtitle: t('settings.tab_bar.description'),
        testID: 'more-settings-tab-bar-select',
        title: t('settings.tab_bar.title'),
      },
      {
        onPress: () => {
          navigation.navigate(MORE_STACK_ROUTES.MoreSettingsPlayback);
        },
        subtitle: t('settings.groups.playback_description'),
        testID: 'more-settings-playback',
        title: t('settings.groups.playback'),
      },
      {
        onPress: () => {
          navigation.navigate(MORE_STACK_ROUTES.MoreSettingsDownloads);
        },
        subtitle: t('settings.groups.downloads_description'),
        testID: 'more-settings-downloads',
        title: t('nav.tab.downloads'),
      },
      {
        onPress: () => {
          navigation.navigate(MORE_STACK_ROUTES.MoreSettingsNotifications);
        },
        subtitle: t('settings.groups.notifications_description'),
        testID: 'more-settings-notifications',
        title: t('settings.notifications.notifications'),
      },
      {
        onPress: () => {
          navigation.navigate(MORE_STACK_ROUTES.MoreTermsOfService);
        },
        subtitle: termsSubtitle,
        testID: 'more-settings-terms',
        title: t('terms_acceptance.header'),
      },
      {
        onPress: () => {
          navigation.navigate(MORE_STACK_ROUTES.MoreSettingsPopularityTracking);
        },
        subtitle: popularityAllowed ? t('misc.on') : t('misc.off'),
        testID: 'more-settings-popularity-tracking',
        title: t('popularity_tracking.title'),
      },
    ],
    [navigation, popularityAllowed, t, termsSubtitle]
  );

  return (
    <MenuListScreen sections={[{ items, key: 'settings-groups' }]} testID="more-settings-screen" />
  );
}
