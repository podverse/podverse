import { Ionicons } from '@expo/vector-icons';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/useTheme';

/**
 * Custom themed native-stack header. Renders a solid, token-colored bar so the header/back button
 * start and finish the same color with no iOS native appearance recolor during push transitions.
 * Native back-swipe still works (this only replaces the header UI, not the native stack).
 */
export function ThemedStackHeader({ back, navigation, options }: NativeStackHeaderProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backButton: {
          alignItems: 'center',
          flexDirection: 'row',
          height: 44,
          justifyContent: 'center',
          left: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.sm,
          position: 'absolute',
          top: 0,
          zIndex: 1,
        },
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          paddingTop: insets.top,
        },
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          height: 44,
          justifyContent: 'center',
          paddingHorizontal: tokens.spacing['4xl'],
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 17,
          fontWeight: '600',
        },
      }),
    [insets.top, themeStyles, tokens]
  );

  const title = options.title ?? '';

  return (
    <View style={styles.container}>
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
      </View>
    </View>
  );
}
