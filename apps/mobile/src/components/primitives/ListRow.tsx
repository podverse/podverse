import type { ReactNode } from 'react';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AccessibilityState } from 'react-native';

import { listRowArtworkGap, listRowVerticalPadding } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { CountBadge } from './CountBadge';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Clamp the subtitle. Omit to leave it unbounded. */
  subtitleNumberOfLines?: number;
  /** Optional third line under the subtitle (playlist creator). */
  meta?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Numeric count shown left of `trailing`. Hidden at 0. */
  badgeCount?: number;
  onPress?: () => void;
  /**
   * Marks the row as the current one: highlighted title color and the selected accessibility
   * state.
   */
  isHighlighted?: boolean;
  /** A tap is in flight. The row keeps its name and ignores further presses. */
  busy?: boolean;
  accessibilityLabel?: string;
  /**
   * Vertical padding for the row. Top and bottom use this same value. Defaults to
   * `tokens.spacing.base`.
   */
  paddingVertical?: number;
  testID?: string;
  subtitleTestID?: string;
  metaTestID?: string;
};

const rowAccessibilityState = (
  isHighlighted: boolean | undefined,
  busy: boolean | undefined
): AccessibilityState | undefined => {
  const state: AccessibilityState = {};
  if (isHighlighted === true) {
    state.selected = true;
  }
  if (busy === true) {
    state.busy = true;
  }
  return state.selected === true || state.busy === true ? state : undefined;
};

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: listRowArtworkGap(tokens.spacing),
    },
    content: {
      flex: 1,
      gap: tokens.spacing.sm,
      justifyContent: 'center',
    },
    meta: {
      ...typography.caption,
      color: tokens.text.accent,
      fontWeight: '500',
    },
    subtitle: {
      ...typography.body,
      color: themeStyles.textSecondary.color,
    },
    title: {
      ...typography.subheading,
      color: themeStyles.textPrimary.color,
      fontSize: 19,
      lineHeight: 26,
    },
    titleHighlighted: {
      color: tokens.text.highlighted,
    },
    trailingCluster: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.sm,
    },
  });

/**
 * Themed list row: optional leading node, a title, an optional subtitle, an optional meta line,
 * and an optional trailing node. Renders as a `Pressable` when `onPress` is supplied, else a
 * static `View`. All copy is passed in by the caller (i18n owned upstream); colors/spacing come
 * from theme tokens.
 */
export const ListRow = memo(function ListRow({
  title,
  subtitle,
  subtitleNumberOfLines,
  meta,
  leading,
  trailing,
  badgeCount,
  onPress,
  isHighlighted,
  busy,
  accessibilityLabel,
  paddingVertical,
  testID,
  subtitleTestID,
  metaTestID,
}: ListRowProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles(createStyles);
  const paddingTop = paddingVertical ?? tokens.spacing.base;
  const containerPadding = useMemo(() => listRowVerticalPadding(paddingTop), [paddingTop]);
  const accessibilityState = rowAccessibilityState(isHighlighted, busy);

  const badge =
    badgeCount !== undefined && badgeCount > 0 ? (
      <CountBadge
        count={badgeCount}
        testID={testID === undefined ? undefined : `${testID}-badge`}
      />
    ) : null;
  const trailingCluster =
    badge !== null || trailing !== undefined ? (
      <View style={styles.trailingCluster}>
        {badge}
        {trailing}
      </View>
    ) : null;

  const body = (
    <>
      {leading}
      <View style={styles.content}>
        <Text
          style={isHighlighted === true ? [styles.title, styles.titleHighlighted] : styles.title}
        >
          {title}
        </Text>
        {subtitle !== undefined ? (
          <Text
            numberOfLines={subtitleNumberOfLines}
            style={styles.subtitle}
            testID={subtitleTestID}
          >
            {subtitle}
          </Text>
        ) : null}
        {meta !== undefined ? (
          <Text numberOfLines={1} style={styles.meta} testID={metaTestID}>
            {meta}
          </Text>
        ) : null}
      </View>
      {trailingCluster}
    </>
  );

  if (onPress === undefined) {
    return (
      <View
        accessibilityState={accessibilityState}
        style={[styles.container, containerPadding]}
        testID={testID}
      >
        {body}
      </View>
    );
  }

  // The explicit label replaces the children, so fold the subtitle and badge in or a screen reader
  // loses them.
  const spokenParts = [title];
  if (subtitle !== undefined) {
    spokenParts.push(subtitle);
  }
  if (meta !== undefined) {
    spokenParts.push(meta);
  }
  const defaultLabel = spokenParts.join('. ');
  const labelWithBadge =
    badgeCount !== undefined && badgeCount > 0 ? `${defaultLabel}, ${badgeCount}` : defaultLabel;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? labelWithBadge}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      onPress={() => {
        if (busy === true) {
          return;
        }
        onPress();
      }}
      style={[styles.container, containerPadding]}
      testID={testID}
    >
      {body}
    </Pressable>
  );
});
