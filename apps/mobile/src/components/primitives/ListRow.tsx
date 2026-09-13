import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { listRowArtworkGap, listRowVerticalPadding } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { CountBadge } from './CountBadge';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Numeric count shown left of `trailing`. Hidden at 0. */
  badgeCount?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  /**
   * Top padding for the row. Bottom is this value plus {@link listRowVerticalPadding}'s optical
   * extra so title ink does not read top-heavy. Defaults to `tokens.spacing.base`.
   */
  paddingVertical?: number;
  testID?: string;
};

/**
 * Themed list row: optional leading node, a title + optional subtitle, and an optional trailing
 * node. Renders as a `Pressable` when `onPress` is supplied, else a static `View`. All copy is
 * passed in by the caller (i18n owned upstream); colors/spacing come from theme tokens.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  badgeCount,
  onPress,
  accessibilityLabel,
  paddingVertical,
  testID,
}: ListRowProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const paddingTop = paddingVertical ?? tokens.spacing.base;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: listRowArtworkGap(tokens.spacing),
          ...listRowVerticalPadding(paddingTop),
        },
        content: {
          flex: 1,
          gap: tokens.spacing.sm,
          justifyContent: 'center',
        },
        subtitle: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
        },
        title: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
        },
        trailingCluster: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
      }),
    [paddingTop, themeStyles, tokens]
  );

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
        <Text style={styles.title}>{title}</Text>
        {subtitle !== undefined ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailingCluster}
    </>
  );

  if (onPress === undefined) {
    return (
      <View style={styles.container} testID={testID}>
        {body}
      </View>
    );
  }

  // The explicit label replaces the children, so fold the subtitle and badge in or a screen reader
  // loses them.
  const defaultLabel = subtitle === undefined ? title : `${title}. ${subtitle}`;
  const labelWithBadge =
    badgeCount !== undefined && badgeCount > 0 ? `${defaultLabel}, ${badgeCount}` : defaultLabel;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? labelWithBadge}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.container}
      testID={testID}
    >
      {body}
    </Pressable>
  );
}
