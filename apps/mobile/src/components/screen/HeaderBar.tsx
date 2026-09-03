import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TypographyStyle } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

export const HEADER_BAR_HEIGHT = 44;

export const headerBarTypography: TypographyStyle = {
  fontSize: 17,
  fontWeight: '600',
  lineHeight: 22,
};

export type HeaderBarProps = {
  children: ReactNode;
  testID?: string;
};

/**
 * Top chrome shared by tab roots and stack titles: safe-area inset and a fixed-height content row.
 * No divider under the title — `headerShadowVisible: false` on the stack keeps iOS from painting
 * one either.
 */
export function HeaderBar({ children, testID }: HeaderBarProps) {
  const { styles: themeStyles } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          paddingTop: insets.top,
        },
        content: {
          height: HEADER_BAR_HEIGHT,
          justifyContent: 'center',
        },
      }),
    [insets.top, themeStyles]
  );

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}
