import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { isTasteProfileTrackingAllowed } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import type { MenuListItem } from '../../components/screen/MenuListScreen';
import { MenuListScreen } from '../../components/screen/MenuListScreen';
import type { MoreStackParamList } from '../../navigation';
import { MORE_STACK_ROUTES } from '../../navigation';
import { getTasteProfileAgreementCurrentVersion } from '../../tasteProfileConsent/tasteProfileConsentGate';

export function MoreSettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { account } = useAuth();
  const tasteProfileAllowed = isTasteProfileTrackingAllowed(
    account?.account_settings,
    getTasteProfileAgreementCurrentVersion()
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
          navigation.navigate(MORE_STACK_ROUTES.MoreSettingsSecondFactor);
        },
        testID: 'more-settings-second-factor',
        title: t('authentication.second_factor_settings'),
      },
      {
        onPress: () => {
          navigation.navigate(MORE_STACK_ROUTES.MoreSettingsChangePassword);
        },
        subtitle: t('settings.account.change_password.description'),
        testID: 'more-settings-change-password',
        title: t('settings.account.change_password.heading'),
      },
      {
        onPress: () => {
          navigation.navigate(MORE_STACK_ROUTES.MoreSettingsSessions);
        },
        testID: 'more-settings-sessions',
        title: t('settings.account.sessions.heading'),
      },
      {
        onPress: () => {
          navigation.navigate(MORE_STACK_ROUTES.MoreSettingsDeveloper);
        },
        subtitle: t('settings.developer.menu_subtitle'),
        testID: 'more-settings-developer',
        title: t('settings.developer.developer'),
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
          navigation.navigate(MORE_STACK_ROUTES.MoreSettingsTasteProfile);
        },
        subtitle: tasteProfileAllowed ? t('misc.on') : t('misc.off'),
        testID: 'more-settings-taste-profile',
        title: t('settings.recommendations.recommendations'),
      },
    ],
    [navigation, tasteProfileAllowed, t, termsSubtitle]
  );

  return (
    <MenuListScreen sections={[{ items, key: 'settings-groups' }]} testID="more-settings-screen" />
  );
}
