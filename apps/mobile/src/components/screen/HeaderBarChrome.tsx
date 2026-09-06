import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { HEADER_BAR_HEIGHT, HeaderBar, headerBarTypography } from './HeaderBar';
import { HeaderBarAction } from './HeaderBarAction';

export type HeaderBarChromeProps = {
  backAccessibilityLabel?: string;
  backTestID?: string;
  onBack?: () => void;
  right?: ReactNode;
  testID?: string;
  title: string;
};

/**
 * Shared title row: optional back, centered title, optional trailing action. Stack headers and
 * full-screen overlays (image viewer) use this instead of each inventing a right-slot Pressable.
 */
export function HeaderBarChrome({
  backAccessibilityLabel,
  backTestID = 'stack-header-back',
  onBack,
  right,
  testID,
  title,
}: HeaderBarChromeProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        left: {
          left: tokens.spacing.sm,
          position: 'absolute',
          top: 0,
          zIndex: 1,
        },
        right: {
          position: 'absolute',
          right: tokens.spacing.sm,
          top: 0,
          zIndex: 1,
        },
        row: {
          alignItems: 'center',
          flex: 1,
          flexDirection: 'row',
          height: HEADER_BAR_HEIGHT,
          justifyContent: 'center',
          paddingHorizontal: tokens.spacing['4xl'],
        },
        title: {
          ...headerBarTypography,
          color: themeStyles.textPrimary.color,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <HeaderBar testID={testID}>
      <View style={styles.row}>
        {onBack !== undefined ? (
          <View style={styles.left}>
            <HeaderBarAction
              accessibilityLabel={backAccessibilityLabel ?? title}
              icon="chevron-back"
              iconSize={28}
              onPress={onBack}
              testID={backTestID}
            />
          </View>
        ) : null}
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {right !== undefined ? <View style={styles.right}>{right}</View> : null}
      </View>
    </HeaderBar>
  );
}
