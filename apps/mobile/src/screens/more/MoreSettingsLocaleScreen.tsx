import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../auth/AuthProvider';
import { syncLocaleToAccountSettings } from '../../auth/syncAccountPrefs';
import { OptionListScreen } from '../../components/form';
import { applyAccountLocaleOverride } from '../../i18n';
import { resolveSupportedLocale } from '../../i18n/locale';
import type { MoreStackParamList } from '../../navigation';
import { getPref, setPref } from '../../prefs/prefsStore';
import type { SettingsLocaleOption } from './settingsLocaleOptions';
import { SETTINGS_LOCALE_OPTIONS } from './settingsLocaleOptions';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreSettingsLocale'>;

export function MoreSettingsLocaleScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { accessToken, setAccount, status, account } = useAuth();
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
    })();

    return () => {
      isMounted = false;
    };
  }, [account, i18n.language, status]);

  const options = useMemo(
    () =>
      SETTINGS_LOCALE_OPTIONS.map((localeOption) => ({
        label: t(`language.languages.${localeOption}`),
        testID: `more-settings-locale-${localeOption}`,
        value: localeOption,
      })),
    [t]
  );

  const handleSelect = useCallback(
    async (locale: SettingsLocaleOption) => {
      setSelectedLocale(locale);
      try {
        await setPref('locale', locale);
        await applyAccountLocaleOverride(locale);
        await syncLocaleToAccountSettings({
          accessToken,
          locale,
          setAccount,
        });
      } catch {
        // Soft-fail and still pop so the user returns to settings; retry from the list if needed.
      }
      navigation.goBack();
    },
    [accessToken, navigation, setAccount]
  );

  return (
    <OptionListScreen
      onSelect={(locale) => {
        void handleSelect(locale);
      }}
      options={options}
      testID="more-settings-locale-screen"
      value={selectedLocale}
    />
  );
}
