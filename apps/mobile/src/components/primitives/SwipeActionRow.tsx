import type { ReactNode } from 'react';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

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

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
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
    /**
     * Opaque full-width face over the revealed action. Without a fill, rows that do not paint
     * their own background leave Remove visible at rest.
     */
    content: {
      alignSelf: 'stretch',
      backgroundColor: themeStyles.screen.backgroundColor,
      width: '100%',
    },
    spinnerOverlay: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

/**
 * List row that reveals a danger action on swipe-left. The same action is exposed via
 * accessibilityActions so VoiceOver / TalkBack users are not swipe-only.
 *
 * The revealed control sits under the row until the swipe opens. It stays out of the
 * accessibility tree while covered, so a screen reader uses the row's remove action and
 * does not land on a button the row is covering.
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
  const swipeableRef = useRef<SwipeableMethods | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const revealAction = useCallback(() => {
    setIsRevealed(true);
  }, []);
  const coverAction = useCallback(() => {
    setIsRevealed(false);
  }, []);

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
        accessibilityElementsHidden={!isRevealed}
        accessibilityLabel={removeLabel}
        accessibilityRole="button"
        accessibilityState={{ busy: isActionLoading, disabled: isActionLoading }}
        disabled={isActionLoading}
        importantForAccessibility={isRevealed ? 'auto' : 'no-hide-descendants'}
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
    isRevealed,
    removeLabel,
    styles.action,
    styles.actionLabel,
    styles.actionLabelHidden,
    styles.spinnerOverlay,
    testID,
    tokens.button.dangerColor,
  ]);

  return (
    <ReanimatedSwipeable
      onSwipeableClose={coverAction}
      onSwipeableWillOpen={revealAction}
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
        style={styles.content}
      >
        {children}
      </View>
    </ReanimatedSwipeable>
  );
}
