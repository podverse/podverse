import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export type HeaderBarActionProps = {
  accessibilityLabel: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  iconSize?: number;
  label?: string;
  onPress: () => void;
  testID: string;
};

/**
 * Title-bar control for the trailing (or leading) header slot. Pass an icon, a localized label,
 * or both. Screens and the image viewer share this so top-right actions stay one control.
 */
export function HeaderBarAction({
  accessibilityLabel,
  icon,
  iconSize = 22,
  label,
  onPress,
  testID,
}: HeaderBarActionProps) {
  const { tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
          minWidth: 44,
          paddingHorizontal: tokens.spacing.sm,
        },
        label: {
          color: tokens.text.accent,
          fontSize: 16,
          fontWeight: '700',
        },
      }),
    [tokens]
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={styles.button}
      testID={testID}
    >
      {icon !== undefined ? (
        <Ionicons color={tokens.text.accent} name={icon} size={iconSize} />
      ) : null}
      {label !== undefined ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}
