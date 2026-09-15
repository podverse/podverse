import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useOfflineMode } from '../../prefs/offlineMode';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { ListRow } from '../primitives/ListRow';

/**
 * Offline Mode switch for More → Features. Sits at the top of the Features card; when on, the
 * description appears under the row so the user knows what the mode does before leaving More.
 */
export function OfflineModeFeaturesHeader() {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { enabled, setEnabled } = useOfflineMode();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        description: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
          paddingBottom: tokens.spacing.lg,
          paddingHorizontal: tokens.spacing.lg,
        },
        row: {
          paddingHorizontal: tokens.spacing.lg,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View>
      <View style={styles.row}>
        <ListRow
          accessibilityLabel={t('settings.offline_mode.title')}
          paddingVertical={tokens.spacing.lg}
          testID="more-offline-mode-row"
          title={t('settings.offline_mode.title')}
          trailing={
            <Switch
              accessibilityLabel={t('settings.offline_mode.title')}
              accessibilityRole="switch"
              accessibilityState={{ checked: enabled }}
              onValueChange={(next) => {
                void setEnabled(next);
              }}
              testID="more-offline-mode-switch"
              value={enabled}
            />
          }
        />
      </View>
      {enabled ? (
        <Text style={styles.description} testID="more-offline-mode-description">
          {t('settings.offline_mode.description')}
        </Text>
      ) : null}
    </View>
  );
}
