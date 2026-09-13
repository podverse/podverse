import type { ReactNode } from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

export type SwipeActionRowProps = {
  children: ReactNode;
  onRemove: () => void;
  /** Accessible name for the remove action (already localized). */
  removeLabel: string;
  testID?: string;
};

/**
 * List row that reveals a danger Remove action on swipe-left. The same action is exposed via
 * accessibilityActions so VoiceOver / TalkBack users are not swipe-only.
 */
export function SwipeActionRow({ children, onRemove, removeLabel, testID }: SwipeActionRowProps) {
  const { tokens } = useTheme();
  const swipeableRef = useRef<Swipeable | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        action: {
          alignItems: 'center',
          backgroundColor: tokens.button.dangerBg,
          justifyContent: 'center',
          width: 88,
        },
        actionLabel: {
          ...typography.label,
          color: tokens.button.dangerColor,
        },
      }),
    [tokens]
  );

  const close = useCallback(() => {
    swipeableRef.current?.close();
  }, []);

  const handleRemove = useCallback(() => {
    close();
    onRemove();
  }, [close, onRemove]);

  const renderRightActions = useCallback(
    (
      _progress: Animated.AnimatedInterpolation<number>,
      dragX: Animated.AnimatedInterpolation<number>
    ) => {
      const translateX = dragX.interpolate({
        extrapolate: 'clamp',
        inputRange: [-88, 0],
        outputRange: [0, 88],
      });
      return (
        <Animated.View style={{ transform: [{ translateX }] }}>
          <Pressable
            accessibilityLabel={removeLabel}
            accessibilityRole="button"
            onPress={handleRemove}
            style={styles.action}
            testID={testID !== undefined ? `${testID}-remove` : undefined}
          >
            <Text style={styles.actionLabel}>{removeLabel}</Text>
          </Pressable>
        </Animated.View>
      );
    },
    [handleRemove, removeLabel, styles.action, styles.actionLabel, testID]
  );

  return (
    <Swipeable
      overshootRight={false}
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      testID={testID}
    >
      <View
        accessibilityActions={[{ label: removeLabel, name: 'remove' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'remove') {
            handleRemove();
          }
        }}
      >
        {children}
      </View>
    </Swipeable>
  );
}
