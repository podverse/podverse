import { useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent, StyleProp, TextStyle } from 'react-native';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from '../../hooks/useReduceMotion';
import {
  MARQUEE_EDGE_HOLD_MS,
  MARQUEE_LOOP_GAP,
  marqueeLoopDistance,
  marqueeScrollDurationMs,
  shouldMarqueeScroll,
  stabilizeMeasuredWidth,
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
 * listener is looking for. Overflowing labels hold on the first word, then travel at a constant
 * speed with a second copy parked after a seam gap so the wrap is a continuation, not a snap.
 * The moving glyphs are painted out of flow so their natural width cannot widen the clip box.
 * An off-screen copy of the label measures that natural width, since a one-line `Text` inside a
 * flex row reports only the width it was allowed.
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
    const distance = marqueeLoopDistance(contentWidth);
    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;

    const runRevolution = () => {
      if (cancelled) {
        return;
      }
      offset.setValue(0);
      animation = Animated.timing(offset, {
        duration: marqueeScrollDurationMs(distance),
        easing: Easing.linear,
        toValue: -distance,
        useNativeDriver: true,
      });
      animation.start(({ finished }) => {
        if (finished) {
          runRevolution();
        }
      });
    };

    animation = Animated.delay(MARQUEE_EDGE_HOLD_MS);
    animation.start(({ finished }) => {
      if (finished) {
        runRevolution();
      }
    });

    return () => {
      cancelled = true;
      animation?.stop();
      offset.setValue(0);
    };
    // `children` restarts from the first word when the now-playing label changes.
  }, [children, contentWidth, offset, scrolls]);

  const handleViewportLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setViewportWidth((previous) => stabilizeMeasuredWidth(previous, next));
  };

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setContentWidth((previous) => stabilizeMeasuredWidth(previous, next));
  };

  const copyStyle = [style, scrolls ? { width: contentWidth } : null];

  return (
    <View style={styles.root} testID={testID}>
      <View collapsable={false} onLayout={handleViewportLayout} style={styles.viewport}>
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          numberOfLines={1}
          style={[style, styles.sizer]}
        >
          {children}
        </Text>
        <Animated.View
          style={[
            styles.paint,
            scrolls ? { transform: [{ translateX: offset }] } : styles.paintFit,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              copyStyle,
              align === 'center' && !scrolls ? styles.centered : null,
              scrolls ? null : styles.fitCopy,
            ]}
          >
            {children}
          </Text>
          {scrolls ? (
            <>
              <View style={styles.seam} />
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                numberOfLines={1}
                style={copyStyle}
              >
                {children}
              </Text>
            </>
          ) : null}
        </Animated.View>
      </View>
      {/*
        Natural-width measurement. The wrapper is far wider than any bar, so the label lays out at
        the width it wants instead of the width the row allows. It is a sibling of the clip box so
        that 10_000dp cannot leak into the viewport's onLayout.
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
  fitCopy: {
    flex: 1,
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
  paint: {
    flexDirection: 'row',
    left: 0,
    position: 'absolute',
    top: 0,
  },
  paintFit: {
    right: 0,
  },
  root: {
    alignSelf: 'stretch',
    minWidth: 0,
    width: '100%',
  },
  seam: {
    width: MARQUEE_LOOP_GAP,
  },
  sizer: {
    opacity: 0,
  },
  viewport: {
    overflow: 'hidden',
    width: '100%',
  },
});
