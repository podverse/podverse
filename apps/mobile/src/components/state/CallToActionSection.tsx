import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { Button, VerticalCenter } from '../primitives';

type CallToActionSectionProps = {
  actionLabelKey: string;
  actionTestID?: string;
  messageKey: string;
  onAction: () => void;
  testID?: string;
};

/**
 * Localized message plus its primary action, centered in the parent via VerticalCenter.
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
        message: {
          ...typography.subheading,
          color: themeStyles.textSecondary.color,
          textAlign: 'center',
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <VerticalCenter testID={testID}>
      <Text style={styles.message}>{t(messageKey)}</Text>
      <View style={styles.action}>
        <Button
          label={t(actionLabelKey)}
          onPress={onAction}
          size="lg"
          testID={actionTestID ?? `${testID}-action`}
        />
      </View>
    </VerticalCenter>
  );
}
