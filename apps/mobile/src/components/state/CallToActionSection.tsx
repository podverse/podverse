import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';

type CallToActionSectionProps = {
  actionLabelKey: string;
  actionTestID?: string;
  messageKey: string;
  onAction: () => void;
  testID?: string;
};

/**
 * Fills its parent and centers a localized message with its primary action.
 *
 * The parent controls the available section height, so this pattern stays between surrounding
 * navigation or list controls without needing screen-specific positioning.
 */
export function CallToActionSection({
  actionLabelKey,
  actionTestID,
  messageKey,
  onAction,
  testID = 'call-to-action-section',
}: CallToActionSectionProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        action: {
          marginTop: tokens.spacing.lg,
        },
        container: {
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
          paddingVertical: tokens.spacing.lg,
        },
        message: {
          ...typography.subheading,
          color: themeStyles.textSecondary.color,
          textAlign: 'center',
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.message}>{t(messageKey)}</Text>
      <View style={styles.action}>
        <Button
          label={t(actionLabelKey)}
          onPress={onAction}
          size="lg"
          testID={actionTestID ?? `${testID}-action`}
        />
      </View>
    </View>
  );
}
