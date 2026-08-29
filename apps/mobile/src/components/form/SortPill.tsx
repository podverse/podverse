import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export type SortPillProps = {
  /** Names the control the value belongs to, e.g. "Sort". Paired with the value for the label. */
  heading: string;
  /**
   * Whether pressing reveals options below. Omit for a pill that navigates away instead, where
   * there is nothing on this screen to expand.
   */
  isExpanded?: boolean;
  onPress: () => void;
  testID: string;
  /** The current selection, already localized — this is what the pill shows. */
  value: string;
};

/**
 * A pill that shows the current sort on its face.
 *
 * The label is the selection rather than a static "Sort", so the ordering of the list below is
 * legible without opening anything. The accessible name pairs the two, because "A-Z" read alone
 * says nothing about which control it belongs to.
 */
export function SortPill({ heading, isExpanded, onPress, testID, value }: SortPillProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          alignSelf: 'flex-start',
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.xs,
        },
        label: {
          color: themeStyles.textPrimary.color,
          fontSize: 13,
          fontWeight: '600',
        },
        row: {
          flexDirection: 'row',
          marginBottom: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={`${heading}: ${value}`}
        accessibilityRole="button"
        accessibilityState={isExpanded === undefined ? undefined : { expanded: isExpanded }}
        onPress={onPress}
        style={styles.button}
        testID={testID}
      >
        <Text style={styles.label}>{value}</Text>
      </Pressable>
    </View>
  );
}
