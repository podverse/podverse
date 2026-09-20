import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export type FullPlayerPaneSheetProps = {
  children: ReactNode;
  /**
   * Viewport-derived slot from `resolveFullPlayerLayout.paneSheetHeight`. Applied as minHeight and
   * matching height/maxHeight so every tab paints the same card and long content cannot grow the
   * outer column.
   */
  height: number;
  /** Gap under the sheet (safe-area bottom + sheet inset) so the bottom radius stays on screen. */
  marginBottom: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Height-locked ink card for the full-player pane. Owns the rounded border and the slot size; tab
 * bodies are just children inside a flex column and must not add their own spacer or grow the outer
 * scroll column.
 */
export function FullPlayerPaneSheet({
  children,
  height,
  marginBottom,
  style,
  testID = 'full-player-pane-sheet',
}: FullPlayerPaneSheetProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          flex: 1,
          minHeight: 0,
        },
        sheet: {
          backgroundColor: themeStyles.paneSheet.backgroundColor,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginHorizontal: tokens.spacing.md,
          overflow: 'hidden',
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View
      style={[
        styles.sheet,
        {
          height,
          marginBottom,
          maxHeight: height,
          minHeight: height,
        },
        style,
      ]}
      testID={testID}
    >
      <View style={styles.body}>{children}</View>
    </View>
  );
}
