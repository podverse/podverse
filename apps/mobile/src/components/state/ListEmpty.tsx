import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';
import { EmptyStateText } from './EmptyStateText';

type ListEmptyProps = {
  messageKey: string;
  testID?: string;
  /**
   * Optional next step, for empty lists the user can act on — "nothing subscribed yet" offering
   * Search. Both props are needed for the button to render; a list that is simply empty says so and
   * stops there.
   */
  actionLabelKey?: string;
  onAction?: () => void;
  /** Defaults to `${testID}-action`. */
  actionTestID?: string;
};

/**
 * Localized empty-list copy at the start of the content column. The sentence is
 * EmptyStateText. The parent supplies the page inset and the gap under the chips.
 */
export function ListEmpty({
  actionLabelKey,
  actionTestID,
  messageKey,
  onAction,
  testID = 'list-empty',
}: ListEmptyProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        action: {
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

  const showAction = actionLabelKey !== undefined && onAction !== undefined;

  return (
    <View style={styles.root} testID={testID}>
      <EmptyStateText message={t(messageKey)} />
      {showAction ? (
        <View style={styles.action}>
          <Button
            fullWidth
            label={t(actionLabelKey)}
            onPress={onAction}
            size="lg"
            testID={actionTestID ?? `${testID}-action`}
            variant="primary"
          />
        </View>
      ) : null}
    </View>
  );
}
