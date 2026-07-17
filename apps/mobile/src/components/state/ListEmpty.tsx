import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

type ListEmptyProps = {
  messageKey?: string;
  testID?: string;
};

export function ListEmpty({ messageKey = 'misc.info', testID = 'list-empty' }: ListEmptyProps) {
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
          textAlign: 'center',
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.label}>{t(messageKey)}</Text>
    </View>
  );
}
