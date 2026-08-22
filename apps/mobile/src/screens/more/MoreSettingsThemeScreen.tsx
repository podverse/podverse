import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ALL_POSSIBLE_THEMES } from '@podverse/design-tokens';
import type { UITheme } from '@podverse/design-tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { OptionListScreen } from '../../components/form';
import type { MoreStackParamList } from '../../navigation';
import { useTheme } from '../../theme/useTheme';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreSettingsTheme'>;

export function MoreSettingsThemeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { setUITheme, uiTheme } = useTheme();

  const options = useMemo(
    () =>
      ALL_POSSIBLE_THEMES.map((themeOption) => ({
        label: t(`settings.ui_theme.${themeOption}`),
        testID: `more-settings-theme-${themeOption}`,
        value: themeOption,
      })),
    [t]
  );

  const handleSelect = useCallback(
    (theme: UITheme) => {
      setUITheme(theme);
      navigation.goBack();
    },
    [navigation, setUITheme]
  );

  return (
    <OptionListScreen
      onSelect={handleSelect}
      options={options}
      testID="more-settings-theme-screen"
      value={uiTheme}
    />
  );
}
