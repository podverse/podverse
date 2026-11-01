import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { VerticalCenter } from '../primitives';

/** Native large ActivityIndicator layout box (iOS / Android). */
const ACTIVITY_INDICATOR_LARGE_SIZE = 36;

type LoadingSectionProps = {
  testID?: string;
};

/**
 * Localized loading spinner, centered in the parent via VerticalCenter.
 * No visible label — the accessible name carries "Loading".
 */
export function LoadingSection({ testID = 'loading-section' }: LoadingSectionProps) {
  const { t } = useTranslation();
  const { styles: themeStyles } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        frame: {
          alignItems: 'center',
          height: ACTIVITY_INDICATOR_LARGE_SIZE,
          justifyContent: 'center',
          width: ACTIVITY_INDICATOR_LARGE_SIZE,
        },
      }),
    []
  );

  return (
    <VerticalCenter testID={testID}>
      <View style={styles.frame}>
        <ActivityIndicator
          accessibilityLabel={t('misc.loading')}
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
          color={themeStyles.buttonPrimary.backgroundColor}
          size="large"
        />
      </View>
    </VerticalCenter>
  );
}
