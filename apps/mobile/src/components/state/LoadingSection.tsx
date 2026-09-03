import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { VerticalCenter } from '../primitives';

type LoadingSectionProps = {
  testID?: string;
};

/**
 * Localized loading spinner, centered in the parent via VerticalCenter.
 */
export function LoadingSection({ testID = 'loading-section' }: LoadingSectionProps) {
  const { t } = useTranslation();
  const { styles: themeStyles } = useTheme();

  return (
    <VerticalCenter testID={testID}>
      <ActivityIndicator
        accessibilityLabel={t('misc.loading')}
        accessibilityLiveRegion="polite"
        accessibilityRole="progressbar"
        accessibilityState={{ busy: true }}
        color={themeStyles.buttonPrimary.backgroundColor}
        size="large"
      />
    </VerticalCenter>
  );
}
