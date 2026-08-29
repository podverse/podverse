import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

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
        button: {
          backgroundColor: themeStyles.buttonPrimary.backgroundColor,
          borderRadius: tokens.radii.round,
          marginTop: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        buttonLabel: {
          color: themeStyles.buttonPrimary.color,
          fontSize: 13,
          fontWeight: '600',
        },
        container: {
          alignItems: 'center',
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
        <Pressable
          accessibilityLabel={t(actionLabelKey)}
          accessibilityRole="button"
          onPress={onAction}
          style={styles.button}
          testID={actionTestID ?? `${testID}-action`}
        >
          <Text style={styles.buttonLabel}>{t(actionLabelKey)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
