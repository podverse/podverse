import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { HeaderBarChrome } from './HeaderBarChrome';

/**
 * Custom themed native-stack header. Renders a solid, token-colored bar so the header/back button
 * start and finish the same color with no iOS native appearance recolor during push transitions.
 * Native back-swipe still works (this only replaces the header UI, not the native stack).
 */
export function ThemedStackHeader({ back, navigation, options }: NativeStackHeaderProps) {
  const { t } = useTranslation();
  const title = options.title ?? '';

  return (
    <HeaderBarChrome
      backAccessibilityLabel={t('misc.go_back')}
      onBack={
        back === undefined
          ? undefined
          : () => {
              navigation.goBack();
            }
      }
      right={
        options.headerRight === undefined
          ? undefined
          : options.headerRight({
              pressColor: options.headerPressColor,
              pressOpacity: options.headerPressOpacity,
              tintColor: options.headerTintColor,
            })
      }
      title={title}
    />
  );
}
