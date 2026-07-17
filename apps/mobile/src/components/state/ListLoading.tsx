import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

type ListLoadingProps = {
  testID?: string;
};

export function ListLoading({ testID = 'list-loading' }: ListLoadingProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          paddingVertical: tokens.spacing.lg,
        },
        label: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.container} testID={testID}>
      <ActivityIndicator color={themeStyles.buttonPrimary.backgroundColor} />
      <Text style={styles.label}>{t('misc.loading')}</Text>
    </View>
  );
}
