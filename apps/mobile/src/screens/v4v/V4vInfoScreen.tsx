import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/primitives/Card';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { useTheme } from '../../theme/useTheme';

/**
 * Value-for-value information screen. The full-player V4V button routes here instead of toggling an
 * inline notice. No LNURL, wallet, or payment logic is handled here. Copy resolves through the
 * mobile catalog.
 */
export function V4vInfoScreen() {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          color: themeStyles.textPrimary.color,
          fontSize: 15,
        },
        cardBody: {
          padding: tokens.spacing.lg,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <MobileScreenContainer heading={t('media_player.value_for_value')} testID="v4v-info-screen">
      <Card padded={false} testID="v4v-info-card">
        <View style={styles.cardBody}>
          <Text style={styles.body}>{t('media_player.value_for_value_body')}</Text>
        </View>
      </Card>
    </MobileScreenContainer>
  );
}
