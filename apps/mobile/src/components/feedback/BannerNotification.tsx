import type { ReactNode } from 'react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useReduceMotion } from '../../hooks/useReduceMotion';
import { BANNER_NOTIFICATION_VISIBLE_MS } from '../../notifications/bannerNotificationQueue';
import {
  bannerNotificationDragOffset,
  shouldDismissBannerNotificationSwipe,
} from '../../notifications/bannerNotificationSwipe';
import { LIST_ROW_ACTION_SIZE, NOTIFICATION_ARTWORK_SIZE } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Card } from '../primitives/Card';
import { CoverImage } from '../primitives/CoverImage';

/** Off-screen offset shared by the enter start and the leave end. */
const BANNER_NOTIFICATION_OFFSCREEN_Y = -240;
const BANNER_NOTIFICATION_ENTER_MS = 220;
const BANNER_NOTIFICATION_LEAVE_MS = 180;

const bannerNotificationAccessibilityLabel = (title: string, body: string | null): string => {
  if (body === null) {
    return title;
  }
  return `${title}. ${body}`;
};

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) => ({
  artwork: {
    borderWidth: 0,
    height: NOTIFICATION_ARTWORK_SIZE,
    width: NOTIFICATION_ARTWORK_SIZE,
  },
  body: {
    flex: 1,
    flexShrink: 1,
    gap: tokens.spacing.xs,
    minWidth: 0,
  },
  dismiss: {
    color: themeStyles.textSecondary.color,
    fontSize: 18,
  },
  dismissHit: {
    alignItems: 'center' as const,
    flexShrink: 0,
    height: LIST_ROW_ACTION_SIZE,
    justifyContent: 'center' as const,
    minWidth: LIST_ROW_ACTION_SIZE,
  },
  motion: {
    alignSelf: 'stretch' as const,
  },
  row: {
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    gap: tokens.spacing.md,
    padding: tokens.spacing.lg,
  },
  swipeArea: {
    alignItems: 'center' as const,
    flex: 1,
    flexDirection: 'row' as const,
    flexShrink: 1,
    gap: tokens.spacing.md,
    minWidth: 0,
  },
  summary: {
    ...typography.caption,
    color: themeStyles.textSecondary.color,
  },
  title: {
    ...typography.body,
    color: themeStyles.textPrimary.color,
  },
});

type BannerNotificationMotion = {
  begin: (notificationId: number) => void;
  cancelInFlight: () => void;
  markUnmounted: () => void;
  onBegin: () => void;
  onCardPress: () => void;
  onDismissPress: () => void;
  onEnd: (translationY: number, velocityY: number) => void;
  onFinalize: () => void;
  onStart: () => void;
  onTouchEnd: () => void;
  onTouchStart: () => void;
  onUpdate: (translationY: number) => void;
  skipEnterForReduceMotion: () => void;
  sync: (input: {
    label: string;
    notificationId: number;
    onClosed: () => void;
    onPress: () => void;
    reduceMotion: boolean;
  }) => void;
};

/**
 * Timer, drag, and slide for one mounted card. Callbacks stay on this object so the pan gesture
 * can keep a stable identity while a finger is down.
 */
const createBannerNotificationMotion = (
  translateY: Animated.Value,
  setEntered: (entered: boolean) => void,
  setLeavingState: (leaving: boolean) => void
): BannerNotificationMotion => {
  const state = {
    alive: true,
    deadlineMs: null as number | null,
    drag: false,
    entered: false,
    generation: 0,
    gestureEndedSerial: -1,
    label: '',
    leaving: false,
    notificationId: 0,
    onClosed: (): void => {},
    onPress: (): void => {},
    reduceMotion: false,
    remainingMs: BANNER_NOTIFICATION_VISIBLE_MS,
    timeout: null as ReturnType<typeof setTimeout> | null,
    touchNotificationId: null as number | null,
    touchSerial: 0,
  };

  const api: { startLeave: () => void } = {
    startLeave: () => {},
  };

  const setEnteredIfAlive = (entered: boolean): void => {
    state.entered = entered;
    if (state.alive) {
      setEntered(entered);
    }
  };

  const clearTimeoutHandle = (): void => {
    if (state.timeout === null) {
      return;
    }
    clearTimeout(state.timeout);
    state.timeout = null;
  };

  const cancelTimer = (): void => {
    clearTimeoutHandle();
    state.deadlineMs = null;
    state.remainingMs = 0;
  };

  const armTimer = (durationMs: number): void => {
    clearTimeoutHandle();
    if (durationMs <= 0) {
      state.deadlineMs = null;
      return;
    }
    const deadline = Date.now() + durationMs;
    state.deadlineMs = deadline;
    state.remainingMs = durationMs;
    state.timeout = setTimeout(() => {
      state.timeout = null;
      if (state.deadlineMs !== deadline) {
        return;
      }
      state.deadlineMs = null;
      if (!state.alive || state.leaving) {
        return;
      }
      api.startLeave();
    }, durationMs);
  };

  const pauseTimer = (): void => {
    if (state.deadlineMs === null) {
      return;
    }
    state.remainingMs = Math.max(0, state.deadlineMs - Date.now());
    state.deadlineMs = null;
    clearTimeoutHandle();
  };

  const resumeTimer = (): void => {
    if (state.leaving || state.deadlineMs !== null) {
      return;
    }
    armTimer(state.remainingMs);
  };

  const finishClosed = (): void => {
    if (!state.alive) {
      return;
    }
    state.onClosed();
  };

  api.startLeave = (): void => {
    if (!state.alive || state.leaving) {
      return;
    }
    state.leaving = true;
    if (state.alive) {
      setLeavingState(true);
    }
    cancelTimer();
    if (state.reduceMotion) {
      finishClosed();
      return;
    }
    const leaveGeneration = state.generation;
    translateY.stopAnimation((value) => {
      if (!state.alive || leaveGeneration !== state.generation) {
        return;
      }
      if (value <= BANNER_NOTIFICATION_OFFSCREEN_Y) {
        finishClosed();
        return;
      }
      Animated.timing(translateY, {
        duration: BANNER_NOTIFICATION_LEAVE_MS,
        toValue: BANNER_NOTIFICATION_OFFSCREEN_Y,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || !state.alive || leaveGeneration !== state.generation) {
          return;
        }
        finishClosed();
      });
    });
  };

  const settleAfterSpring = (releaseGeneration: number): void => {
    if (!state.alive || state.leaving || releaseGeneration !== state.generation) {
      return;
    }
    if (state.remainingMs <= 0) {
      api.startLeave();
      return;
    }
    resumeTimer();
  };

  const resumeUnactivated = (): void => {
    resumeTimer();
    if (state.remainingMs !== 0) {
      return;
    }
    setTimeout(() => {
      if (!state.alive || state.leaving) {
        return;
      }
      api.startLeave();
    }, 0);
  };

  const playEnter = (id: number): void => {
    translateY.stopAnimation();
    const enterGeneration = state.generation;
    if (state.reduceMotion) {
      translateY.setValue(0);
      setEnteredIfAlive(true);
      return;
    }
    setEnteredIfAlive(false);
    translateY.setValue(BANNER_NOTIFICATION_OFFSCREEN_Y);
    Animated.timing(translateY, {
      duration: BANNER_NOTIFICATION_ENTER_MS,
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (
        !finished ||
        !state.alive ||
        enterGeneration !== state.generation ||
        state.leaving ||
        state.notificationId !== id
      ) {
        return;
      }
      setEnteredIfAlive(true);
    });
  };

  const stopInFlight = (): void => {
    state.generation += 1;
    cancelTimer();
    translateY.stopAnimation();
  };

  return {
    begin: (id: number): void => {
      state.notificationId = id;
      state.leaving = false;
      if (state.alive) {
        setLeavingState(false);
      }
      stopInFlight();
      armTimer(BANNER_NOTIFICATION_VISIBLE_MS);
      playEnter(id);
      if (Platform.OS !== 'android') {
        AccessibilityInfo.announceForAccessibility(state.label);
      }
    },
    cancelInFlight: (): void => {
      stopInFlight();
    },
    markUnmounted: (): void => {
      state.alive = false;
      stopInFlight();
    },
    onBegin: (): void => {
      state.drag = false;
      pauseTimer();
      state.touchNotificationId = state.notificationId;
    },
    onCardPress: (): void => {
      if (state.drag || state.leaving) {
        return;
      }
      if (
        state.touchNotificationId !== null &&
        state.touchNotificationId !== state.notificationId
      ) {
        return;
      }
      state.onPress();
      api.startLeave();
    },
    onDismissPress: (): void => {
      if (state.drag || state.leaving) {
        return;
      }
      if (
        state.touchNotificationId !== null &&
        state.touchNotificationId !== state.notificationId
      ) {
        return;
      }
      api.startLeave();
    },
    onEnd: (translationY: number, velocityY: number): void => {
      if (state.touchNotificationId !== state.notificationId || state.leaving) {
        return;
      }
      const releaseGeneration = state.generation;
      if (shouldDismissBannerNotificationSwipe({ translationY, velocityY })) {
        api.startLeave();
        return;
      }
      if (state.reduceMotion) {
        translateY.setValue(0);
        settleAfterSpring(releaseGeneration);
        return;
      }
      translateY.stopAnimation();
      Animated.spring(translateY, {
        damping: 30,
        mass: 1,
        overshootClamping: true,
        restDisplacementThreshold: 0.5,
        restSpeedThreshold: 0.5,
        stiffness: 400,
        toValue: 0,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || releaseGeneration !== state.generation) {
          return;
        }
        settleAfterSpring(releaseGeneration);
      });
    },
    onFinalize: (): void => {
      state.gestureEndedSerial = state.touchSerial;
      if (state.drag) {
        return;
      }
      resumeUnactivated();
    },
    onStart: (): void => {
      state.drag = true;
    },
    onTouchEnd: (): void => {
      const serial = state.touchSerial;
      setTimeout(() => {
        if (serial !== state.touchSerial || state.leaving || state.drag) {
          return;
        }
        if (state.gestureEndedSerial === serial) {
          return;
        }
        resumeUnactivated();
      }, 0);
    },
    onTouchStart: (): void => {
      state.touchSerial += 1;
      state.gestureEndedSerial = -1;
      pauseTimer();
      state.touchNotificationId = state.notificationId;
    },
    onUpdate: (translationY: number): void => {
      if (state.touchNotificationId !== state.notificationId || state.leaving) {
        return;
      }
      translateY.setValue(bannerNotificationDragOffset(translationY));
    },
    skipEnterForReduceMotion: (): void => {
      if (!state.reduceMotion || state.leaving || state.entered) {
        return;
      }
      state.generation += 1;
      translateY.stopAnimation();
      translateY.setValue(0);
      setEnteredIfAlive(true);
    },
    sync: (input): void => {
      state.label = input.label;
      state.notificationId = input.notificationId;
      state.onClosed = input.onClosed;
      state.onPress = input.onPress;
      state.reduceMotion = input.reduceMotion;
    },
  };
};

export type BannerNotificationProps = {
  notificationId: number;
  title: string;
  body: string | null;
  imageUrl: string | null;
  dismissLabel: string;
  accessibilityHint: string;
  onPress: () => void;
  onClosed: () => void;
};

/**
 * One banner card. The title is the notification line and the body is the relative time under it.
 * The card slides down, stays briefly,
 * and leaves upward. A swipe up, the Dismiss control, and the timer leave without opening the
 * notification. A tap opens it, then leaves. Reduce Motion skips the slide. A finger on the card
 * pauses the timer until it lifts.
 */
export function BannerNotification({
  accessibilityHint,
  body,
  dismissLabel,
  imageUrl,
  notificationId,
  onClosed,
  onPress,
  title,
}: BannerNotificationProps): ReactNode {
  const reduceMotion = useReduceMotion();
  const styles = useThemedStyles(createStyles);
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const translateY = useRef(new Animated.Value(BANNER_NOTIFICATION_OFFSCREEN_Y)).current;
  const motionRef = useRef<BannerNotificationMotion | null>(null);
  if (motionRef.current === null) {
    motionRef.current = createBannerNotificationMotion(translateY, setEntered, setLeaving);
  }
  const motion = motionRef.current;
  const accessibilityLabel = bannerNotificationAccessibilityLabel(title, body);

  motion.sync({
    label: accessibilityLabel,
    notificationId,
    onClosed,
    onPress,
    reduceMotion,
  });

  useLayoutEffect(() => {
    motion.begin(notificationId);
    return () => {
      motion.cancelInFlight();
    };
  }, [motion, notificationId]);

  useLayoutEffect(() => {
    return () => {
      motion.markUnmounted();
    };
  }, [motion]);

  useLayoutEffect(() => {
    motion.skipEnterForReduceMotion();
  }, [motion, reduceMotion]);

  const panEnabled = entered && !leaving;
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .maxPointers(1)
        .enabled(panEnabled)
        .activeOffsetY([-10, 10])
        .failOffsetX([-24, 24])
        .cancelsTouchesInView(true)
        .onBegin(() => {
          motion.onBegin();
        })
        .onStart(() => {
          motion.onStart();
        })
        .onUpdate((event) => {
          motion.onUpdate(event.translationY);
        })
        .onEnd((event) => {
          motion.onEnd(event.translationY, event.velocityY);
        })
        .onFinalize(() => {
          motion.onFinalize();
        }),
    [motion, panEnabled]
  );

  return (
    <Animated.View style={[styles.motion, { transform: [{ translateY }] }]}>
      <Card padded={false}>
        <View style={styles.row}>
          <GestureDetector gesture={pan}>
            <View
              collapsable={false}
              onTouchCancel={motion.onTouchEnd}
              onTouchEnd={motion.onTouchEnd}
              onTouchStart={motion.onTouchStart}
              style={styles.swipeArea}
            >
              <CoverImage
                decodeEdge={NOTIFICATION_ARTWORK_SIZE}
                opensViewer={false}
                style={styles.artwork}
                uri={imageUrl}
              />
              <Pressable
                accessibilityHint={accessibilityHint}
                accessibilityLabel={accessibilityLabel}
                accessibilityLiveRegion="polite"
                accessibilityRole="button"
                onPress={motion.onCardPress}
                style={styles.body}
                testID="banner-notification"
              >
                <Text numberOfLines={1} style={styles.title} testID="banner-notification-title">
                  {title}
                </Text>
                {body !== null ? (
                  <Text numberOfLines={1} style={styles.summary}>
                    {body}
                  </Text>
                ) : null}
              </Pressable>
            </View>
          </GestureDetector>
          <Pressable
            accessibilityLabel={dismissLabel}
            accessibilityRole="button"
            onPress={motion.onDismissPress}
            style={styles.dismissHit}
            testID="banner-notification-dismiss"
          >
            <Text style={styles.dismiss}>✕</Text>
          </Pressable>
        </View>
      </Card>
    </Animated.View>
  );
}
