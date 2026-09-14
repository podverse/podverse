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
 * Actions stretch to the fill column width. An optional secondary action sits under the primary
 * for discovery fills that offer two paths.
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
        actions: {
          alignItems: 'stretch',
          gap: tokens.spacing.base,
          marginTop: tokens.spacing.lg,
          width: '100%',
        },
        content: {
          alignSelf: 'stretch',
          width: '100%',
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
      <View style={styles.content}>
        <Text style={styles.message}>{t(messageKey)}</Text>
        <View style={styles.actions}>
          <Button
            fullWidth
            label={t(actionLabelKey)}
            onPress={onAction}
            size="lg"
            testID={actionTestID ?? `${testID}-action`}
          />
          {hasSecondary ? (
            <Button
              fullWidth
              label={t(secondaryActionLabelKey)}
              onPress={onSecondaryAction}
              size="lg"
              testID={secondaryActionTestID ?? `${testID}-secondary-action`}
              variant="outline"
            />
          ) : null}
        </View>
      </View>
    </VerticalCenter>
  );
}
