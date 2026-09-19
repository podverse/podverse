import { useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent, StyleProp, TextStyle } from 'react-native';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from '../../hooks/useReduceMotion';
import {
  MARQUEE_EDGE_HOLD_MS,
  MARQUEE_RESET_MS,
  marqueeScrollDistance,
  marqueeScrollDurationMs,
  shouldMarqueeScroll,
} from '../../lib/text/marqueeScroll';

export type MarqueeTextProps = {
  /**
   * Where the label sits when it fits. A scrolling label always starts at the leading edge, since
   * the pass has to begin at the first word.
   */
  align?: 'center' | 'left';
  children: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

/**
 * Single-line label that scrolls itself when it is too long for the space it has, and truncates
 * instead under Reduce Motion.
 *
 * Built for player chrome, where the bar is one line tall and the full title is the thing the
 * listener is looking for. An off-screen copy of the label measures its natural width, since a
 * one-line `Text` inside a flex row reports only the width it was allowed.
 */
export function MarqueeText({ align = 'left', children, style, testID }: MarqueeTextProps) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const reduceMotion = useReduceMotion();
  const offset = useRef(new Animated.Value(0)).current;

  const scrolls = shouldMarqueeScroll({ contentWidth, reduceMotion, viewportWidth });

  useEffect(() => {
    offset.setValue(0);
    if (!scrolls) {
      return;
    }
    const distance = marqueeScrollDistance(contentWidth, viewportWidth);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(MARQUEE_EDGE_HOLD_MS),
        Animated.timing(offset, {
          duration: marqueeScrollDurationMs(distance),
          toValue: -distance,
          useNativeDriver: true,
        }),
        Animated.delay(MARQUEE_EDGE_HOLD_MS),
        Animated.timing(offset, {
          duration: MARQUEE_RESET_MS,
          toValue: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => {
      animation.stop();
      offset.setValue(0);
    };
    // `children` restarts the pass from the beginning when the now-playing label changes.
  }, [children, contentWidth, offset, scrolls, viewportWidth]);

  const handleViewportLayout = (event: LayoutChangeEvent) => {
    setViewportWidth(event.nativeEvent.layout.width);
  };

  const handleContentLayout = (event: LayoutChangeEvent) => {
    setContentWidth(event.nativeEvent.layout.width);
  };

  return (
    <View onLayout={handleViewportLayout} style={styles.viewport} testID={testID}>
      <Animated.Text
        numberOfLines={1}
        style={[
          style,
          align === 'center' && !scrolls ? styles.centered : null,
          scrolls ? { transform: [{ translateX: offset }], width: contentWidth } : null,
        ]}
      >
        {children}
      </Animated.Text>
      {/*
        Natural-width measurement. The wrapper is far wider than any bar, so the label lays out at
        the width it wants instead of the width the row allows, and it takes no layout space because
        it is positioned out of flow.
      */}
      <View pointerEvents="none" style={styles.measureWrapper}>
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          numberOfLines={1}
          onLayout={handleContentLayout}
          style={[style, styles.measureText]}
        >
          {children}
        </Text>
      </View>
    </View>
  );
}

/** Wider than any phone or tablet bar, so measurement is never clamped by the row. */
const MEASURE_MAX_WIDTH = 10_000;

const styles = StyleSheet.create({
  centered: {
    textAlign: 'center',
  },
  measureText: {
    alignSelf: 'flex-start',
  },
  measureWrapper: {
    left: 0,
    opacity: 0,
    position: 'absolute',
    top: 0,
    width: MEASURE_MAX_WIDTH,
  },
  viewport: {
    overflow: 'hidden',
  },
});
