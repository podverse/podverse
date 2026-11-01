import type { ReactNode } from 'react';
import { useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { listRowVerticalPadding } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { ToggleSwitch } from '../primitives/ToggleSwitch';
import { SettingsDependentContext } from './SettingsDependentGroup';

export type SettingsSwitchRowProps = {
  title: string;
  accessibilityLabel?: string;
  /** Spoken with the switch when the title alone does not explain the row. */
  accessibilityHint?: string;
  disabled?: boolean;
  /** When set, a hairline sits above this row (every row after the first in a group). */
  showDivider?: boolean;
  /** Visual mark after the title. The accessible name stays the title. */
  titleMarker?: string;
  testID: string;
  /**
   * Trailing switch id. Defaults to `${testID}-toggle`. Pass this when a flow already
   * addresses the switch by its own id.
   */
  switchTestID?: string;
  /**
   * Horizontal inset. Turn off when the parent already applies the page gutter, so the title
   * lines up with sibling text.
   */
  inset?: boolean;
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

/** Shift a single-line title so its ink lines up with the switch. */
const SETTINGS_SWITCH_TITLE_NUDGE = 2;

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    children: {
      gap: tokens.spacing.xs,
      marginTop: tokens.spacing.sm,
    },
    description: {
      ...typography.body,
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
    },
    rowNested: {
      paddingLeft: 0,
      paddingRight: tokens.spacing.lg,
      paddingVertical: tokens.spacing.base,
    },
    rowParent: {
      paddingHorizontal: tokens.spacing.lg,
    },
    rowSwitch: {
      paddingVertical: tokens.spacing.lg,
    },
    rowText: {
      ...listRowVerticalPadding(tokens.spacing.lg),
    },
    title: {
      ...typography.subheading,
      color: themeStyles.textPrimary.color,
      flex: 1,
      fontSize: 19,
      fontWeight: '400',
      lineHeight: 26,
    },
    titleColumn: {
      flex: 1,
    },
    titleNudge: {
      includeFontPadding: false,
      transform: [{ translateY: SETTINGS_SWITCH_TITLE_NUDGE }],
    },
  });

/**
 * Settings row with a trailing switch, or a pressable row when `onPress` is supplied without a
 * switch. A switch row uses equal vertical padding and shifts a single-line title so its ink
 * lines up with the switch. Inside `SettingsDependentGroup`, the row indents further and the
 * switch names the parent setting.
 */
export function SettingsSwitchRow({
  accessibilityHint,
  accessibilityLabel,
  children,
  disabled = false,
  inset = true,
  onPress,
  onValueChange,
  showDivider = false,
  switchTestID,
  testID,
  title,
  titleMarker,
  value,
}: SettingsSwitchRowProps) {
  const styles = useThemedStyles(createStyles);
  const dependent = useContext(SettingsDependentContext);
  const isNested = dependent !== null;
  const label = accessibilityLabel ?? title;
  const isSwitch = onValueChange !== undefined && value !== undefined;
  const hasTitleDetail = children !== undefined && children !== null;
  const alignTitleToSwitch = isSwitch && !hasTitleDetail;
  const rowStyle = [
    styles.row,
    isNested ? styles.rowNested : inset ? styles.rowParent : null,
    isNested ? null : isSwitch ? styles.rowSwitch : styles.rowText,
    !isNested && showDivider ? styles.divider : null,
  ];

  const body = (
    <>
      <View style={styles.titleColumn}>
        <Text
          accessibilityLabel={titleMarker !== undefined && titleMarker !== '' ? title : undefined}
          style={[styles.title, alignTitleToSwitch ? styles.titleNudge : null]}
        >
          {title}
          {titleMarker !== undefined && titleMarker !== '' ? (
            <Text accessibilityElementsHidden importantForAccessibility="no">
              {` ${titleMarker}`}
            </Text>
          ) : null}
        </Text>
        {children !== undefined ? <View style={styles.children}>{children}</View> : null}
      </View>
      {isSwitch ? (
        <ToggleSwitch
          accessibilityHint={accessibilityHint ?? dependent?.accessibilityHint}
          accessibilityLabel={label}
          accessibilityRole="switch"
          accessibilityState={{ checked: value, disabled }}
          disabled={disabled}
          onValueChange={onValueChange}
          testID={switchTestID ?? `${testID}-toggle`}
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
        style={rowStyle}
        testID={testID}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View style={rowStyle} testID={testID}>
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
