import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';

type ListEmptyProps = {
  messageKey?: string;
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

export function ListEmpty({
  actionLabelKey,
  actionTestID,
  messageKey = 'misc.info',
  onAction,
  testID = 'list-empty',
}: ListEmptyProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          alignSelf: 'stretch',
          paddingVertical: tokens.spacing.lg,
        },
        label: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          textAlign: 'center',
        },
      }),
    [themeStyles, tokens]
  );

  const showAction = actionLabelKey !== undefined && onAction !== undefined;

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.label}>{t(messageKey)}</Text>
      {showAction ? (
        <Button
          label={t(actionLabelKey)}
          onPress={onAction}
          size="md"
          testID={actionTestID ?? `${testID}-action`}
          variant="primary"
        />
      ) : null}
    </View>
  );
}
