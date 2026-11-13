import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { chipRowGap } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';

export type ChipRowWithActionsProps = {
  /** Page actions. Always a band above the chips. */
  actions: ReactNode;
  /** Shown under the action band, above the chips. */
  actionsNote?: ReactNode;
  actionsTestID?: string;
  /** The chip row. */
  children: ReactNode;
};

/**
 * Page actions sit above the chips, aligned to the start. An optional note sits under the
 * action band and above the chips. The action group wraps on its own line so two labels stay
 * together when they fit and drop under each other when they do not.
 */
export function ChipRowWithActions({
  actions,
  actionsNote,
  actionsTestID,
  children,
}: ChipRowWithActionsProps) {
  const { tokens } = useTheme();
  const gap = tokens.spacing.lg;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actions: {
          alignItems: 'center',
          alignSelf: 'stretch',
          flexDirection: 'row',
          flexGrow: 0,
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: chipRowGap(),
        },
        chips: {
          alignSelf: 'stretch',
        },
        layout: {
          alignItems: 'flex-start',
          flexDirection: 'column',
          rowGap: gap,
        },
        note: {
          alignSelf: 'stretch',
        },
      }),
    [gap]
  );

  return (
    <View style={styles.layout}>
      <View style={styles.actions} testID={actionsTestID}>
        {actions}
      </View>
      {actionsNote !== undefined && actionsNote !== null ? (
        <View style={styles.note}>{actionsNote}</View>
      ) : null}
      <View style={styles.chips}>{children}</View>
    </View>
  );
}
