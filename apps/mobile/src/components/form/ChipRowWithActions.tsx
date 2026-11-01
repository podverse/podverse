import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { listChipRowBottomGap } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';

export type ChipRowWithActionsProps = {
  /** Page actions. Ahead of the chips when the row wraps. */
  actions: ReactNode;
  actionsTestID?: string;
  /** The chip row. */
  children: ReactNode;
  /** Intrinsic width of the chips and their trailing controls. */
  chipsContentWidth: number;
};

/**
 * Page actions share the chip row when both fit on one line, and sit above the chips, aligned
 * to the start, when they do not. The actions group moves as one piece.
 */
export function ChipRowWithActions({
  actions,
  actionsTestID,
  children,
  chipsContentWidth,
}: ChipRowWithActionsProps) {
  const { tokens } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const [actionsWidth, setActionsWidth] = useState(0);
  const gap = tokens.spacing.lg;
  const stacked =
    containerWidth > 0 &&
    actionsWidth > 0 &&
    chipsContentWidth > 0 &&
    chipsContentWidth + gap + actionsWidth > containerWidth;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actions: {
          flexGrow: 0,
          flexShrink: 0,
          paddingBottom: stacked ? 0 : listChipRowBottomGap(tokens.spacing),
        },
        chips: stacked
          ? {
              alignSelf: 'stretch',
            }
          : {
              flexGrow: 1,
              flexShrink: 1,
              minWidth: 0,
            },
        layout: {
          alignItems: stacked ? 'flex-start' : 'center',
          columnGap: gap,
          flexDirection: stacked ? 'column' : 'row',
          rowGap: gap,
        },
      }),
    [gap, stacked, tokens.spacing]
  );

  const measureActions = (width: number) => {
    setActionsWidth((current) => (current === width ? current : width));
  };

  const actionsNode = (
    <View
      onLayout={(event) => {
        measureActions(event.nativeEvent.layout.width);
      }}
      style={styles.actions}
      testID={actionsTestID}
    >
      {actions}
    </View>
  );

  return (
    <View
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        setContainerWidth((current) => (current === width ? current : width));
      }}
      style={styles.layout}
    >
      {stacked ? actionsNode : null}
      <View style={styles.chips}>{children}</View>
      {stacked ? null : actionsNode}
    </View>
  );
}
