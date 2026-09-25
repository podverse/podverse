import { beforeEach, describe, expect, it, vi } from 'vitest';

const addEventListener = vi.fn();
const isReduceMotionEnabled = vi.fn();
const removeNativeListener = vi.fn();
let reduceMotionChangedHandler: ((enabled: boolean) => void) | undefined;

const isReduceMotionHandler = (value: unknown): value is (enabled: boolean) => void => {
  return typeof value === 'function';
};

vi.mock('react-native', () => {
  return {
    AccessibilityInfo: {
      addEventListener: (...args: unknown[]) => addEventListener(...args),
      isReduceMotionEnabled: (...args: unknown[]) => isReduceMotionEnabled(...args),
    },
  };
});

describe('useReduceMotion', () => {
  beforeEach(() => {
    vi.resetModules();
    addEventListener.mockReset();
    isReduceMotionEnabled.mockReset();
    removeNativeListener.mockReset();
    reduceMotionChangedHandler = undefined;
    isReduceMotionEnabled.mockResolvedValue(false);
    addEventListener.mockImplementation((eventName: unknown, handler: unknown) => {
      if (eventName === 'reduceMotionChanged' && isReduceMotionHandler(handler)) {
        reduceMotionChangedHandler = handler;
      }
      return { remove: removeNativeListener };
    });
  });

  const loadStore = async () => {
    return import('./useReduceMotion');
  };

  it('registers one native listener for two mounted consumers', async () => {
    const { getReduceMotionSnapshot, subscribeReduceMotion, useReduceMotion } = await loadStore();

    subscribeReduceMotion(() => undefined);
    subscribeReduceMotion(() => undefined);

    expect(typeof useReduceMotion).toBe('function');
    expect(getReduceMotionSnapshot()).toBe(false);
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledWith('reduceMotionChanged', expect.any(Function));
    expect(isReduceMotionEnabled).toHaveBeenCalledTimes(1);
  });

  it('updates every mounted subscriber on reduceMotionChanged', async () => {
    const { getReduceMotionSnapshot, subscribeReduceMotion } = await loadStore();
    const first = vi.fn();
    const second = vi.fn();

    subscribeReduceMotion(first);
    subscribeReduceMotion(second);
    reduceMotionChangedHandler?.(true);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(getReduceMotionSnapshot()).toBe(true);

    reduceMotionChangedHandler?.(true);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('keeps notifying the remaining subscriber after one unmounts', async () => {
    const { subscribeReduceMotion } = await loadStore();
    const first = vi.fn();
    const second = vi.fn();

    const unsubscribeFirst = subscribeReduceMotion(first);
    subscribeReduceMotion(second);
    unsubscribeFirst();
    reduceMotionChangedHandler?.(true);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does not tear down the native listener when the last subscriber unmounts', async () => {
    const { subscribeReduceMotion } = await loadStore();
    const unsubscribeFirst = subscribeReduceMotion(() => undefined);
    const unsubscribeSecond = subscribeReduceMotion(() => undefined);

    unsubscribeFirst();
    unsubscribeSecond();
    subscribeReduceMotion(() => undefined);

    expect(removeNativeListener).not.toHaveBeenCalled();
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(isReduceMotionEnabled).toHaveBeenCalledTimes(1);
  });
});
