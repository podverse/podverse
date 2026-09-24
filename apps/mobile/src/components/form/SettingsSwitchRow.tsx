import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { listRowVerticalPadding } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

export type SettingsSwitchRowProps = {
  title: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** When set, a hairline sits above this row (every row after the first in a group). */
  showDivider?: boolean;
  testID: string;
  /**
   * Trailing switch. Omit when the row is pressable-only (deferred features that explain
   * themselves on tap rather than flipping a dead switch).
   */
  value?: boolean;
  onValueChange?: (next: boolean) => void;
  /** Press handler for rows that are not switches (e.g. auto-download placeholder). */
  onPress?: () => void;
  /** Optional content under the title (feed status lines, notices). */
  children?: ReactNode;
};

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    children: {
      gap: tokens.spacing.xs,
      marginTop: tokens.spacing.sm,
    },
    description: {
      ...typography.caption,
      color: themeStyles.textSecondary.color,
    },
    divider: {
      borderTopColor: themeStyles.border.borderColor,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.lg,
      ...listRowVerticalPadding(tokens.spacing.lg),
    },
    title: {
      ...typography.body,
      color: themeStyles.textPrimary.color,
      flex: 1,
    },
    titleColumn: {
      flex: 1,
    },
  });

/**
 * Settings row with a trailing switch, or a pressable row when `onPress` is supplied without a
 * switch. Title and switch share one horizontal inset so section titles and row text align.
 */
export function SettingsSwitchRow({
  accessibilityLabel,
  children,
  disabled = false,
  onPress,
  onValueChange,
  showDivider = false,
  testID,
  title,
  value,
}: SettingsSwitchRowProps) {
  const styles = useThemedStyles(createStyles);
  const label = accessibilityLabel ?? title;
  const isSwitch = onValueChange !== undefined && value !== undefined;

  const body = (
    <>
      <View style={styles.titleColumn}>
        <Text style={styles.title}>{title}</Text>
        {children !== undefined ? <View style={styles.children}>{children}</View> : null}
      </View>
      {isSwitch ? (
        <Switch
          accessibilityLabel={label}
          accessibilityRole="switch"
          accessibilityState={{ checked: value, disabled }}
          disabled={disabled}
          onValueChange={onValueChange}
          testID={`${testID}-toggle`}
          value={value}
        />
      ) : null}
    </>
  );

  if (onPress !== undefined && !isSwitch) {
    return (
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={[styles.row, showDivider ? styles.divider : null]}
        testID={testID}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, showDivider ? styles.divider : null]} testID={testID}>
      {body}
    </View>
  );
}

/** Secondary description text for feed status lines and notices under a settings row. */
export function SettingsRowDescription({
  children,
  testID,
}: {
  children: string;
  testID?: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Text style={styles.description} testID={testID}>
      {children}
    </Text>
  );
}
