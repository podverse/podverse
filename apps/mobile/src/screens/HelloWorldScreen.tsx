import Constants from 'expo-constants';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { DEFAULT_LOCALE } from '@podverse/helpers/locales';
import { formatSecondsToReadableDuration } from '@podverse/helpers/timeFormatter';

import { useTheme } from '../theme/useTheme';

const APP_DISPLAY_NAME = 'Podverse Next';

export function HelloWorldScreen() {
  const { i18n, t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const version = Constants.expoConfig?.version ?? 'unknown';
  const activeLocale = i18n.resolvedLanguage || i18n.language || DEFAULT_LOCALE;
  const durationSmokeValue = formatSecondsToReadableDuration('125', activeLocale);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          maxWidth: 440,
          padding: tokens.spacing['2xl'],
          width: '100%',
        },
        container: {
          alignItems: 'center',
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
          justifyContent: 'center',
          padding: tokens.spacing['2xl'],
        },
        helperSmoke: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          marginTop: tokens.spacing.lg,
          textAlign: 'center',
        },
        subtitle: {
          color: themeStyles.textSecondary.color,
          fontSize: 18,
          marginTop: tokens.spacing.md,
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 28,
          fontWeight: '600',
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.container} testID="hello-world-screen">
      <View style={styles.card}>
        <Text style={styles.title} testID="hello-world-title">
          {t('test.hello_world')}
        </Text>
        <Text style={styles.subtitle} testID="hello-world-version">
          {APP_DISPLAY_NAME} v{version}
        </Text>
        <Text style={styles.helperSmoke} testID="hello-world-helpers-smoke">
          {t('language.language')}: {activeLocale}
        </Text>
        <Text style={styles.helperSmoke} testID="hello-world-duration-smoke">
          Duration smoke: {durationSmokeValue}
        </Text>
      </View>
    </View>
  );
}
