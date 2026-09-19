import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo } from 'react';
import type { ViewProps } from 'react-native';
import { Animated } from 'react-native';

import type { OverlayTransitionKind } from './overlayTransitions';
import { OVERLAY_SHEET_TRAVEL } from './overlayTransitions';

type OverlayTransitionValue = {
  kind: OverlayTransitionKind;
  progress: Animated.Value;
};

const fallbackTransition: OverlayTransitionValue = {
  kind: 'none',
  progress: new Animated.Value(1),
};

const OverlayTransitionContext = createContext<OverlayTransitionValue>(fallbackTransition);

export function OverlayTransitionProvider({
  children,
  kind,
  progress,
}: PropsWithChildren<{
  kind: OverlayTransitionKind;
  progress: Animated.Value;
}>) {
  const value = useMemo(() => ({ kind, progress }), [kind, progress]);

  return (
    <OverlayTransitionContext.Provider value={value}>{children}</OverlayTransitionContext.Provider>
  );
}

export const useOverlayTransition = (): OverlayTransitionValue =>
  useContext(OverlayTransitionContext);

/**
 * Dim backdrop, or a whole-layer fade when the overlay has no separate panel. Opacity follows the
 * overlay's progress; this role never slides.
 */
export function OverlayScrim({ children, style, ...rest }: ViewProps) {
  const { progress } = useOverlayTransition();

  return (
    <Animated.View style={[style, { opacity: progress }]} {...rest}>
      {children}
    </Animated.View>
  );
}

/**
 * Overlay content panel. Fades with the overlay's progress, and rises a short distance when the
 * overlay's animation is `slide`.
 */
export function OverlayPanel({ children, style, ...rest }: ViewProps) {
  const { kind, progress } = useOverlayTransition();
  const slide =
    kind === 'slide'
      ? {
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [OVERLAY_SHEET_TRAVEL, 0],
              }),
            },
          ],
        }
      : null;

  return (
    <Animated.View style={[style, { opacity: progress }, slide]} {...rest}>
      {children}
    </Animated.View>
  );
}
