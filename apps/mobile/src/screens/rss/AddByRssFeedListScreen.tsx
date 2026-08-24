import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text } from 'react-native';

import type { LibraryStackParamList } from '../../navigation';
import { useTheme } from '../../theme/useTheme';

type AddByRssFeedListScreenProps = NativeStackScreenProps<
  LibraryStackParamList,
  'AddByRssFeedList'
>;

export function AddByRssFeedListScreen(_props: AddByRssFeedListScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          padding: tokens.spacing.lg,
        },
        message: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          marginTop: tokens.spacing.sm,
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 24,
          fontWeight: '700',
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: themeStyles.screen.backgroundColor }}
      testID="rss-feed-list-screen"
    >
      <Text style={styles.title}>{t('features.add_by_rss.label')}</Text>
      <Text style={styles.message}>{t('features.add_by_rss.no_feeds')}</Text>
    </ScrollView>
  );
}
