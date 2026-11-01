import type { PropsWithChildren } from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '../hooks/useReduceMotion';
import { shouldDismissSlideUpSwipe, slideUpDismissDragOffset } from './slideUpDismissSwipe';
import { slideUpDismissHeaderBandHeight } from './slideUpScreen';

const SLIDE_UP_DISMISS_LEAVE_MS = 200;
const SLIDE_UP_DISMISS_SPRING_BACK = {
  friction: 8,
  tension: 80,
  useNativeDriver: true,
} as const;

export type SlideUpDismissGestureProps = PropsWithChildren<{
  /** When false, children render without a pan recognizer. */
  enabled: boolean;
  onDismiss: () => void;
}>;

/**
 * Downward drag from the header band that follows the finger and dismisses past a distance or
 * velocity threshold. Used on Android for root slide-up cards (native-stack vertical pop is
 * iOS-only) and on both platforms for the auth Modal sheet.
 */
export function SlideUpDismissGesture({
  children,
  enabled,
  onDismiss,
}: SlideUpDismissGestureProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const headerBandHeight = slideUpDismissHeaderBandHeight(insets.top);
  const translateY = useRef(new Animated.Value(0)).current;
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const dismissingRef = useRef(false);

  const finishDismiss = useCallback(() => {
    if (dismissingRef.current) {
      return;
    }
    dismissingRef.current = true;
    onDismissRef.current();
    // Auth Modal keeps this tree mounted under `visible={false}`; reset for the next open.
    translateY.setValue(0);
    dismissingRef.current = false;
  }, [translateY]);

  const springBack = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      ...SLIDE_UP_DISMISS_SPRING_BACK,
    }).start();
  }, [translateY]);

  const slideOffThenDismiss = useCallback(() => {
    const height = Dimensions.get('window').height;
    Animated.timing(translateY, {
      duration: SLIDE_UP_DISMISS_LEAVE_MS,
      toValue: height,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        finishDismiss();
      }
    });
  }, [finishDismiss, translateY]);

  const pan = useMemo(() => {
    if (!enabled) {
      return Gesture.Pan().enabled(false);
    }

    return Gesture.Pan()
      .runOnJS(true)
      .maxPointers(1)
      .activeOffsetY(10)
      .failOffsetX([-24, 24])
      .hitSlop({ height: headerBandHeight, top: 0 })
      .onUpdate((event) => {
        if (dismissingRef.current || reduceMotionRef.current) {
          return;
        }
        translateY.setValue(slideUpDismissDragOffset(event.translationY));
      })
      .onEnd((event) => {
        if (dismissingRef.current) {
          return;
        }
        if (
          !shouldDismissSlideUpSwipe({
            translationY: event.translationY,
            velocityY: event.velocityY,
          })
        ) {
          if (!reduceMotionRef.current) {
            springBack();
          }
          return;
        }
        if (reduceMotionRef.current) {
          finishDismiss();
          return;
        }
        slideOffThenDismiss();
      });
  }, [enabled, finishDismiss, headerBandHeight, slideOffThenDismiss, springBack, translateY]);

  if (!enabled) {
    return children;
  }

  return (
    <GestureDetector gesture={pan}>
      <Animated.View collapsable={false} style={[styles.root, { transform: [{ translateY }] }]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
