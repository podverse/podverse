import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

type ListErrorProps = {
  messageKey?: string;
  onRetry: () => void;
  testID?: string;
};

export function ListError({
  messageKey = 'errors.generic',
  onRetry,
  testID = 'list-error',
}: ListErrorProps) {
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

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.label}>{t(messageKey)}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={styles.button}
        testID="list-error-retry"
      >
        <Text style={styles.buttonLabel}>{t('misc.try_again')}</Text>
      </Pressable>
    </View>
  );
}
