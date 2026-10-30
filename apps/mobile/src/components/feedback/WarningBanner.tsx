import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';

const WARNING_BANNER_ICON_SIZE = 20;

export type WarningBannerProps = {
  /** Already localized. */
  actionLabel: string;
  actionLoading?: boolean;
  actionTestID: string;
  /** Already localized. The message's accessible name. */
  message: string;
  onAction: () => void;
  testID: string;
};

/**
 * A warning about the screen it sits on, with one action that resolves it. Warning fill, border,
 * and glyph; never the danger colors.
 */
export function WarningBanner({
  actionLabel,
  actionLoading = false,
  actionTestID,
  message,
  onAction,
  testID,
}: WarningBannerProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        action: {
          alignItems: 'flex-start',
        },
        banner: {
          backgroundColor: tokens.background.warning,
          borderColor: tokens.border.warning,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          gap: tokens.spacing.md,
          padding: tokens.spacing.md,
        },
        message: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
          flex: 1,
        },
        messageRow: {
          alignItems: 'flex-start',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.banner} testID={testID}>
      <View
        accessibilityLabel={message}
        accessibilityRole="text"
        accessible
        style={styles.messageRow}
      >
        <Ionicons
          accessibilityElementsHidden
          accessible={false}
          color={tokens.text.warning}
          importantForAccessibility="no"
          name="warning-outline"
          size={WARNING_BANNER_ICON_SIZE}
        />
        <Text style={styles.message}>{message}</Text>
      </View>
      <View style={styles.action}>
        <Button
          label={actionLabel}
          loading={actionLoading}
          onPress={onAction}
          size="sm"
          testID={actionTestID}
          variant="outline"
        />
      </View>
    </View>
  );
}
