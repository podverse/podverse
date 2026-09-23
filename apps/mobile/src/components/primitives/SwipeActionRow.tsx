import type { ReactNode } from 'react';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

export type SwipeActionRowProps = {
  children: ReactNode;
  onRemove: () => void | Promise<void>;
  /** Accessible name for the revealed action (already localized). */
  removeLabel: string;
  /** Overrides the default `${testID}-remove` on the revealed control. */
  actionTestID?: string;
  testID?: string;
};

const createStyles = ({ tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    action: {
      alignItems: 'center',
      alignSelf: 'stretch',
      backgroundColor: tokens.button.dangerBg,
      justifyContent: 'center',
      paddingHorizontal: tokens.spacing.lg,
    },
    actionLabel: {
      ...typography.label,
      color: tokens.button.dangerColor,
    },
    actionLabelHidden: {
      opacity: 0,
    },
    spinnerOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

/**
 * List row that reveals a danger action on swipe-left. The same action is exposed via
 * accessibilityActions so VoiceOver / TalkBack users are not swipe-only.
 *
 * While an async `onRemove` runs, the label stays in layout at zero opacity and a spinner overlays
 * it, so the revealed button does not change width when the text is hidden.
 */
export function SwipeActionRow({
  actionTestID,
  children,
  onRemove,
  removeLabel,
  testID,
}: SwipeActionRowProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles(createStyles);
  const swipeableRef = useRef<Swipeable | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const close = useCallback(() => {
    swipeableRef.current?.close();
  }, []);

  const handleRemove = useCallback(() => {
    if (isActionLoading) {
      return;
    }

    const result = onRemove();
    if (!(result instanceof Promise)) {
      close();
      return;
    }

    setIsActionLoading(true);
    void result.then(
      () => {
        close();
      },
      () => {
        setIsActionLoading(false);
      }
    );
  }, [close, isActionLoading, onRemove]);

  const renderRightActions = useCallback(() => {
    return (
      <Pressable
        accessibilityLabel={removeLabel}
        accessibilityRole="button"
        accessibilityState={{ busy: isActionLoading, disabled: isActionLoading }}
        disabled={isActionLoading}
        onPress={handleRemove}
        style={styles.action}
        testID={actionTestID ?? (testID !== undefined ? `${testID}-remove` : undefined)}
      >
        <Text style={[styles.actionLabel, isActionLoading ? styles.actionLabelHidden : null]}>
          {removeLabel}
        </Text>
        {isActionLoading ? (
          <View pointerEvents="none" style={styles.spinnerOverlay}>
            <ActivityIndicator color={tokens.button.dangerColor} size="small" />
          </View>
        ) : null}
      </Pressable>
    );
  }, [
    actionTestID,
    handleRemove,
    isActionLoading,
    removeLabel,
    styles.action,
    styles.actionLabel,
    styles.actionLabelHidden,
    styles.spinnerOverlay,
    testID,
    tokens.button.dangerColor,
  ]);

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
