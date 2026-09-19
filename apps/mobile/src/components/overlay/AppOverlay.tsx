import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import { Animated, BackHandler } from 'react-native';

import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useOverlayStore } from './OverlayHost';
import { OverlayTransitionProvider } from './OverlayTransition';
import type { OverlayTransitionKind } from './overlayTransitions';
import { resolveOverlayTransitionDurations } from './overlayTransitions';

export type AppOverlayProps = PropsWithChildren<{
  /** Defaults to `fade`. `none` keeps the same-commit mount and unmount. */
  animation?: OverlayTransitionKind;
  /** Android hardware back while the overlay is open. Scrims route here too. */
  onRequestClose: () => void;
  visible: boolean;
}>;

type OverlayPhase = 'closing' | 'idle' | 'open';

/**
 * Presents `children` full-screen above the app, in the app's own window. Drop-in stand-in for an
 * RN `Modal` on in-app overlays — see `OverlayHost` for why none of them use `Modal`.
 *
 * Renders nothing in place; the content is handed to `OverlayOutlet`, which is mounted above the
 * navigator. Content therefore resolves context from the outlet's position, which carries every app
 * provider but not the navigator — overlays take their data and callbacks as props rather than
 * reading navigation state.
 *
 * `animation` defaults to `fade`. `none` and Reduce Motion both mount and unmount in the same
 * commit. A dismissal leaves the accessibility tree as soon as it is accepted, then finishes its
 * pixels; a closing overlay is not focusable and does not keep the app behind it hidden.
 */
export function AppOverlay({
  animation = 'fade',
  children,
  onRequestClose,
  visible,
}: AppOverlayProps) {
  const store = useOverlayStore();
  const id = useId();
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const phaseRef = useRef<OverlayPhase>('idle');
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const { enterMs, exitMs } = resolveOverlayTransitionDurations({
    kind: animation,
    reduceMotion,
  });

  const wrap = (node: ReactNode) => (
    <OverlayTransitionProvider kind={animation} progress={progress}>
      {node}
    </OverlayTransitionProvider>
  );

  const stopInFlight = () => {
    animationRef.current?.stop();
    animationRef.current = null;
  };

  // Layout effect so the overlay lands in the same commit as the state that opened it, with no
  // frame of the screen showing through.
  useLayoutEffect(() => {
    if (!visible) {
      if (phaseRef.current === 'idle') {
        store.removeEntry(id);
        return;
      }
      if (phaseRef.current === 'closing') {
        return;
      }

      stopInFlight();

      if (exitMs === 0) {
        progress.setValue(0);
        phaseRef.current = 'idle';
        store.removeEntry(id);
        return;
      }

      store.beginClose(id);
      phaseRef.current = 'closing';
      const closing = Animated.timing(progress, {
        duration: exitMs,
        toValue: 0,
        useNativeDriver: true,
      });
      animationRef.current = closing;
      closing.start(({ finished }) => {
        if (animationRef.current === closing) {
          animationRef.current = null;
        }
        if (!finished || visibleRef.current) {
          return;
        }
        phaseRef.current = 'idle';
        store.removeEntry(id);
      });
      return;
    }

    store.setEntry(id, wrap(children));

    if (phaseRef.current === 'open') {
      return;
    }

    stopInFlight();

    if (enterMs === 0) {
      progress.setValue(1);
      phaseRef.current = 'open';
      return;
    }

    if (phaseRef.current === 'idle') {
      progress.setValue(0);
    }

    const entering = Animated.timing(progress, {
      duration: enterMs,
      toValue: 1,
      useNativeDriver: true,
    });
    animationRef.current = entering;
    phaseRef.current = 'open';
    entering.start(() => {
      if (animationRef.current === entering) {
        animationRef.current = null;
      }
    });
  }, [animation, children, enterMs, exitMs, id, progress, store, visible]);

  useEffect(
    () => () => {
      stopInFlight();
      store.removeEntry(id);
    },
    [id, store]
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onRequestClose();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [onRequestClose, visible]);

  return null;
}
