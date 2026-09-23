import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

type Listener = () => void;

let reduceMotion = false;
const listeners = new Set<Listener>();
let nativeListenerStarted = false;

const emit = (): void => {
  listeners.forEach((listener) => {
    listener();
  });
};

const applyReduceMotion = (enabled: boolean): void => {
  if (enabled === reduceMotion) {
    return;
  }
  reduceMotion = enabled;
  emit();
};

const startNativeListener = (): void => {
  if (nativeListenerStarted) {
    return;
  }
  nativeListenerStarted = true;
  void AccessibilityInfo.isReduceMotionEnabled().then(applyReduceMotion);
  AccessibilityInfo.addEventListener('reduceMotionChanged', applyReduceMotion);
};

export const subscribeReduceMotion = (listener: Listener): (() => void) => {
  listeners.add(listener);
  startNativeListener();
  return () => {
    listeners.delete(listener);
  };
};

export const getReduceMotionSnapshot = (): boolean => reduceMotion;

/**
 * Whether the OS Reduce Motion setting is on. The initial read is async, so the first paint is
 * always `false` and a follow-up render applies the real value. One process-wide native listener
 * keeps the value in sync and stays registered for the life of the process.
 */
export const useReduceMotion = (): boolean => {
  return useSyncExternalStore(subscribeReduceMotion, getReduceMotionSnapshot);
};
