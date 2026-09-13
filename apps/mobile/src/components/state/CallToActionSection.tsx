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
  /** Optional second button under the primary (e.g. Browse beside Search). */
  secondaryActionLabelKey?: string;
  secondaryActionTestID?: string;
  onSecondaryAction?: () => void;
  testID?: string;
};

/**
 * Localized message plus its primary action, centered in the parent via VerticalCenter.
 * An optional secondary action sits under the primary for discovery fills that offer two paths.
 */
export function CallToActionSection({
  actionLabelKey,
  actionTestID,
  messageKey,
  onAction,
  secondaryActionLabelKey,
  secondaryActionTestID,
  onSecondaryAction,
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
        actions: {
          alignItems: 'center',
          gap: tokens.spacing.base,
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

  const hasSecondary = secondaryActionLabelKey !== undefined && onSecondaryAction !== undefined;

  return (
    <VerticalCenter testID={testID}>
      <Text style={styles.message}>{t(messageKey)}</Text>
      {hasSecondary ? (
        <View style={styles.actions}>
          <Button
            label={t(actionLabelKey)}
            onPress={onAction}
            size="lg"
            testID={actionTestID ?? `${testID}-action`}
          />
          <Button
            label={t(secondaryActionLabelKey)}
            onPress={onSecondaryAction}
            size="lg"
            testID={secondaryActionTestID ?? `${testID}-secondary-action`}
            variant="outline"
          />
        </View>
      ) : (
        <View style={styles.action}>
          <Button
            label={t(actionLabelKey)}
            onPress={onAction}
            size="lg"
            testID={actionTestID ?? `${testID}-action`}
          />
        </View>
      )}
    </VerticalCenter>
  );
}
