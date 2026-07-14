import Constants from 'expo-constants';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_LOCALE } from '@podverse/helpers/locales';
import { formatSecondsToReadableDuration } from '@podverse/helpers/timeFormatter';

import { getMobileApiBaseUrl } from '../config/apiBaseUrl';
import { PlaybackEngineDebugPanel } from '../debug/PlaybackEngineDebugPanel';
import { useTheme } from '../theme/useTheme';

const APP_DISPLAY_NAME = 'Podverse Next';

export function HelloWorldScreen() {
  const { i18n, t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const version = Constants.expoConfig?.version ?? 'unknown';
  const activeLocale = i18n.resolvedLanguage || i18n.language || DEFAULT_LOCALE;
  const durationSmokeValue = formatSecondsToReadableDuration('125', activeLocale);
  const apiBaseUrl = getMobileApiBaseUrl();
  const [apiHealthStatus, setApiHealthStatus] = useState<
    'not-configured' | 'loading' | 'ok' | 'error'
  >(apiBaseUrl ? 'loading' : 'not-configured');
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
        localeButton: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.sm,
          borderWidth: 1,
          marginHorizontal: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        localeButtonLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
        },
        localeRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          marginTop: tokens.spacing.lg,
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

  useEffect(() => {
    if (!apiBaseUrl) {
      setApiHealthStatus('not-configured');
      return;
    }

    let isCancelled = false;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 5000);

    setApiHealthStatus('loading');
    void fetch(`${apiBaseUrl}/api/v2/health`, { signal: abortController.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unexpected status ${response.status}`);
        }
        if (!isCancelled) {
          setApiHealthStatus('ok');
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setApiHealthStatus('error');
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [apiBaseUrl]);

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
        <View style={styles.localeRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void i18n.changeLanguage('en-US');
            }}
            style={styles.localeButton}
            testID="hello-world-locale-en"
          >
            <Text style={styles.localeButtonLabel}>en-US</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void i18n.changeLanguage('es');
            }}
            style={styles.localeButton}
            testID="hello-world-locale-es"
          >
            <Text style={styles.localeButtonLabel}>es</Text>
          </Pressable>
        </View>
        <Text style={styles.helperSmoke} testID="hello-world-duration-smoke">
          Duration smoke: {durationSmokeValue}
        </Text>
        <Text style={styles.helperSmoke} testID="hello-world-api-base-url">
          API base URL: {apiBaseUrl ?? 'not-configured'}
        </Text>
        <Text style={styles.helperSmoke} testID="hello-world-api-health-status">
          API health: {apiHealthStatus}
        </Text>
        <PlaybackEngineDebugPanel />
      </View>
    </View>
  );
}
