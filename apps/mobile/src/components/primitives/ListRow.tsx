import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
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
  onPress,
  accessibilityLabel,
  paddingVertical,
  testID,
}: ListRowProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          flexDirection: 'row',
          paddingVertical: paddingVertical ?? tokens.spacing.md,
        },
        content: {
          flex: 1,
        },
        leading: {
          marginRight: tokens.spacing.md,
        },
        subtitle: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.xs,
        },
        title: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
        },
        trailing: {
          marginLeft: tokens.spacing.md,
        },
      }),
    [paddingVertical, themeStyles, tokens]
  );

  const body = (
    <>
      {leading !== undefined ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle !== undefined ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing !== undefined ? <View style={styles.trailing}>{trailing}</View> : null}
    </>
  );

  if (onPress === undefined) {
    return (
      <View style={styles.container} testID={testID}>
        {body}
      </View>
    );
  }

  // The explicit label replaces the children, so fold the subtitle in or a screen reader loses it.
  const defaultLabel = subtitle === undefined ? title : `${title}. ${subtitle}`;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? defaultLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.container}
      testID={testID}
    >
      {body}
    </Pressable>
  );
}
