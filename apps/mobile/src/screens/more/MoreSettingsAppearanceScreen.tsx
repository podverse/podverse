import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { SettingsOptionNavRow } from '../../components/form';
import { Card } from '../../components/primitives/Card';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { resolveSupportedLocale } from '../../i18n/locale';
import type { MoreStackParamList } from '../../navigation';
import { MORE_STACK_ROUTES } from '../../navigation';
import { getPref, setPref } from '../../prefs/prefsStore';
import { useTheme } from '../../theme/useTheme';
import type { SettingsLocaleOption } from './settingsLocaleOptions';

export function MoreSettingsAppearanceScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { account, status } = useAuth();
  const { styles: themeStyles, tokens, uiTheme } = useTheme();
  const [selectedLocale, setSelectedLocale] = useState<SettingsLocaleOption>(
    resolveSupportedLocale(i18n.language) as SettingsLocaleOption
  );

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const accountLocale = account?.account_settings?.account_settings_locale?.locale;
      const targetLocale =
        status === 'authenticated'
          ? resolveSupportedLocale(accountLocale)
          : resolveSupportedLocale((await getPref('locale')) ?? i18n.language);

      if (!isMounted) {
        return;
      }

      setSelectedLocale(targetLocale as SettingsLocaleOption);
      await setPref('locale', targetLocale);
    })();

    return () => {
      isMounted = false;
    };
  }, [account, i18n.language, status]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        divider: {
          backgroundColor: themeStyles.border.borderColor,
          height: StyleSheet.hairlineWidth,
          marginHorizontal: tokens.spacing.lg,
        },
        row: {
          padding: tokens.spacing.lg,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <MobileScreenContainer testID="more-settings-appearance-screen">
      <Card padded={false} testID="more-settings-appearance-card">
        <View style={styles.row}>
          <SettingsOptionNavRow
            description={t('settings.ui_theme.description')}
            onPress={() => {
              navigation.navigate(MORE_STACK_ROUTES.MoreSettingsTheme);
            }}
            testID="more-settings-theme-select"
            title={t('settings.ui_theme.theme')}
            valueLabel={t(`settings.ui_theme.${uiTheme}`)}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <SettingsOptionNavRow
            description={t('language.description')}
            onPress={() => {
              navigation.navigate(MORE_STACK_ROUTES.MoreSettingsLocale);
            }}
            testID="more-settings-locale-select"
            title={t('language.select_language')}
            valueLabel={t(`language.languages.${selectedLocale}`)}
          />
        </View>
      </Card>
    </MobileScreenContainer>
  );
}
