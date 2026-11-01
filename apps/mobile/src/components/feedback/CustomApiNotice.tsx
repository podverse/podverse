import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useCustomApiBaseUrl } from '../../config/customApiEndpoint';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

/**
 * Shown where a person types a secret or starts a purchase, so a custom API address is visible
 * before the request leaves the phone.
 */
export function CustomApiNotice() {
  const { t } = useTranslation();
  const apiUrl = useCustomApiBaseUrl();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
        },
        label: {
          ...typography.label,
          color: themeStyles.textPrimary.color,
        },
        notice: {
          backgroundColor: tokens.background.warning,
          borderColor: tokens.border.warning,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          gap: tokens.spacing.sm,
          marginBottom: tokens.spacing.lg,
          padding: tokens.spacing.md,
        },
        url: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
          fontWeight: '400',
        },
      }),
    [themeStyles, tokens]
  );

  if (apiUrl === null) {
    return null;
  }

  return (
    <View accessibilityRole="alert" style={styles.notice} testID="custom-api-notice">
      <Text style={styles.label}>{t('custom_api.notice_label')}</Text>
      <Text selectable style={styles.url} testID="custom-api-notice-url">
        {apiUrl}
      </Text>
      <Text style={styles.body}>{t('custom_api.notice_body')}</Text>
    </View>
  );
}
