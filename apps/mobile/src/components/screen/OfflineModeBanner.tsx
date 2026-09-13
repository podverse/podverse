import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useOfflineMode } from '../../prefs/offlineMode';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

/**
 * Slim warning strip above the mini player while Offline Mode is on. Lives in the persistent
 * bottom chrome (with sync progress and the mini player) so it stays fixed across stack pushes.
 * Returns null when Offline Mode is off.
 */
export function OfflineModeBanner() {
  const { t } = useTranslation();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          backgroundColor: tokens.background.warning,
          borderTopColor: tokens.border.warning,
          borderTopWidth: StyleSheet.hairlineWidth,
          justifyContent: 'center',
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.xs,
        },
        label: {
          ...typography.caption,
          color: tokens.text.warning,
          fontWeight: '600',
          textAlign: 'center',
        },
      }),
    [tokens]
  );

  if (!offlineModeEnabled) {
    return null;
  }

  return (
    <View
      accessibilityRole="text"
      accessible
      style={styles.container}
      testID="offline-mode-banner"
    >
      <Text style={styles.label}>{t('settings.offline_mode.banner')}</Text>
    </View>
  );
}
