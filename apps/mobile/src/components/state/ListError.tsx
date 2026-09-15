import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';

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
        action: {
          marginTop: tokens.spacing.lg,
          width: '100%',
        },
        container: {
          alignSelf: 'stretch',
          paddingVertical: tokens.spacing.lg,
          width: '100%',
        },
        label: {
          ...typography.subheading,
          color: themeStyles.textSecondary.color,
          textAlign: 'center',
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.label}>{t(messageKey)}</Text>
      <View style={styles.action}>
        <Button
          fullWidth
          label={t('misc.try_again')}
          onPress={onRetry}
          size="lg"
          testID="list-error-retry"
        />
      </View>
    </View>
  );
}
