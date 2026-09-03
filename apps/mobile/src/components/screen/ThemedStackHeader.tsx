import { Ionicons } from '@expo/vector-icons';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { HEADER_BAR_HEIGHT, HeaderBar, headerBarTypography } from './HeaderBar';

/**
 * Custom themed native-stack header. Renders a solid, token-colored bar so the header/back button
 * start and finish the same color with no iOS native appearance recolor during push transitions.
 * Native back-swipe still works (this only replaces the header UI, not the native stack).
 */
export function ThemedStackHeader({ back, navigation, options }: NativeStackHeaderProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backButton: {
          alignItems: 'center',
          flexDirection: 'row',
          height: HEADER_BAR_HEIGHT,
          justifyContent: 'center',
          left: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.sm,
          position: 'absolute',
          top: 0,
          zIndex: 1,
        },
        rightButton: {
          alignItems: 'center',
          height: HEADER_BAR_HEIGHT,
          justifyContent: 'center',
          paddingHorizontal: tokens.spacing.sm,
          position: 'absolute',
          right: tokens.spacing.sm,
          top: 0,
          zIndex: 1,
        },
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: tokens.spacing['4xl'],
        },
        title: {
          ...headerBarTypography,
          color: themeStyles.textPrimary.color,
        },
      }),
    [themeStyles, tokens]
  );

  const title = options.title ?? '';

  return (
    <HeaderBar>
      <View style={styles.row}>
        {back !== undefined ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              navigation.goBack();
            }}
            style={styles.backButton}
            testID="stack-header-back"
          >
            <Ionicons color={tokens.text.accent} name="chevron-back" size={28} />
          </Pressable>
        ) : null}
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {options.headerRight !== undefined ? (
          <View style={styles.rightButton}>
            {options.headerRight({
              pressColor: options.headerPressColor,
              pressOpacity: options.headerPressOpacity,
              tintColor: options.headerTintColor,
            })}
          </View>
        ) : null}
      </View>
    </HeaderBar>
  );
}
