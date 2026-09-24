import type { ReactNode } from 'react';
import { useLayoutEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { notePerfTouch, stampPerfFrame } from '../../lib/perf/perfFrames';
import { perfMark } from '../../lib/perf/perfSpans';
import { listChipRowBottomGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { filterChipChrome } from './chipChrome';

export type SectionChipVariant = 'filter' | 'pill';

export type SectionChipProps = {
  /** Already-localized. Doubles as the accessible name. */
  label: string;
  onPress: () => void;
  selected: boolean;
  testID: string;
  /**
   * `pill` is a media-type tab (round, primary fill when selected). `filter` is a list
   * narrow (square radius in both states; accent outline when selected), same family as
   * the sort chip.
   */
  variant?: SectionChipVariant;
};

export type SectionChipItem<T extends string> = {
  key: T;
  /** Already-localized. */
  label: string;
  testID: string;
};

export type SectionChipRowProps<T extends string> = {
  items: readonly SectionChipItem<T>[];
  onSelect: (key: T) => void;
  /** `null` when none of the chips is the current selection. */
  selectedKey: T | null;
  testID: string;
  /**
   * Sort, range, and Categories — only when the current chip can use them. Renders after the
   * section chips so those pills keep a stable order.
   */
  trailing?: ReactNode;
};

/**
 * One chip in a horizontal selector row. Reads as a tab to assistive tech, with its selected state,
 * so a screen reader user learns the same thing a sighted user reads from the filled pill.
 */
export function SectionChip({
  label,
  onPress,
  selected,
  testID,
  variant = 'pill',
}: SectionChipProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const isFilter = variant === 'filter';
  const filterChrome = filterChipChrome(
    tokens,
    { borderColor: themeStyles.border.borderColor, textColor: themeStyles.textPrimary.color },
    selected
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          marginRight: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        chipActive: {
          backgroundColor: themeStyles.buttonPrimary.backgroundColor,
          borderColor: themeStyles.buttonPrimary.backgroundColor,
        },
        chipLabel: {
          ...typography.label,
          color: themeStyles.textPrimary.color,
        },
        chipLabelActive: {
          color: themeStyles.buttonPrimary.color,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={isFilter ? 'button' : 'tab'}
      accessibilityState={{ selected }}
      onPress={(event) => {
        notePerfTouch(event.nativeEvent.timestamp);
        onPress();
      }}
      onPressIn={() => {
        perfMark('chip.pressin', testID);
      }}
      style={[styles.chip, isFilter ? filterChrome.chip : selected ? styles.chipActive : null]}
      testID={testID}
    >
      <Text
        style={[
          styles.chipLabel,
          isFilter ? filterChrome.label : selected ? styles.chipLabelActive : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Horizontal chip selector with a trailing slot.
 *
 * Section and media-type chips stay in the order the caller handed in. The trailing slot is what
 * lets one row carry both "which list" and "how it is ordered": Home and Browse put sort and
 * Categories after the media types, and a channel screen puts sort and the popularity window after
 * its sections. Those trailing controls mount only when the current filter can use them. The chips
 * themselves are handed in already localized, so the row has no opinion about which medium it is
 * describing.
 *
 * Bottom padding is **`listChipRowBottomGap`** — the seam before filter / list / about content —
 * so every screen that mounts this row gets the same space without a local margin.
 */
export function SectionChipRow<T extends string>({
  items,
  onSelect,
  selectedKey,
  testID,
  trailing,
}: SectionChipRowProps<T>) {
  const { tokens } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: {
          paddingBottom: listChipRowBottomGap(tokens.spacing),
        },
        scrollContent: {
          alignItems: 'center',
        },
      }),
    [tokens]
  );

  // Runs in the commit that first shows the newly selected chip.
  useLayoutEffect(() => {
    stampPerfFrame('chip.visible');
  }, [selectedKey]);

  return (
    <View accessible={false} testID={testID}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
      >
        {items.map((item) => (
          <SectionChip
            key={item.key}
            label={item.label}
            onPress={() => {
              onSelect(item.key);
            }}
            selected={item.key === selectedKey}
            testID={item.testID}
          />
        ))}
        {trailing}
      </ScrollView>
    </View>
  );
}
