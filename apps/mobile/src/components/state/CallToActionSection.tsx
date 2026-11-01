import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';
import { EmptyStateText } from './EmptyStateText';

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
 * Localized message plus its primary action, at the start of the parent.
 * The sentence is EmptyStateText. Actions stretch to the fill column width and sit under the
 * banner. An optional secondary action sits under the primary for discovery fills that offer
 * two paths.
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
  const { tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actions: {
          alignItems: 'stretch',
          gap: tokens.spacing.base,
          marginTop: tokens.spacing.lg,
          width: '100%',
        },
        root: {
          alignSelf: 'stretch',
          width: '100%',
        },
      }),
    [tokens]
  );

  const hasSecondary = secondaryActionLabelKey !== undefined && onSecondaryAction !== undefined;

  return (
    <View style={styles.root} testID={testID}>
      <EmptyStateText message={t(messageKey)} />
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
  );
}
