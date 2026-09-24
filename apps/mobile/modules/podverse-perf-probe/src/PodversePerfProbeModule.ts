/**
 * Typed accessor for the native `PodversePerfProbe` module. Resolves lazily so pure-JS unit tests
 * and builds without a native rebuild do not throw at import time. `expo-modules-core` is required
 * inside the function so Node vitest can import this file without the native package.
 */

import type { FrameProbeSnapshot, FrameStamp, LongFrame } from './types';

export type PodversePerfProbeNativeModule = {
  drainFrameStamps?: () => FrameStamp[];
  drainLongFrames?: () => LongFrame[];
  log?: (message: string) => void;
  reset(): void;
  snapshot(): FrameProbeSnapshot;
  stampNextFrame?: (tag: string, touchMs: number) => void;
  start(): void;
  startSession?: () => void;
  stop(): void;
  uptimeMs?: () => number;
};

type RequireNativeModule = <T>(name: string) => T;

let cachedModule: PodversePerfProbeNativeModule | null | undefined;

/**
 * Returns the native probe when linked, otherwise null. A Debug build that has not been rebuilt
 * after adding this module returns null rather than crashing the app.
 */
export function getPodversePerfProbeModule(): PodversePerfProbeNativeModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy so Node tests never load expo-modules-core
    const expoModulesCore = require('expo-modules-core') as {
      requireNativeModule: RequireNativeModule;
    };
    cachedModule =
      expoModulesCore.requireNativeModule<PodversePerfProbeNativeModule>('PodversePerfProbe');
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export function isPodversePerfProbeAvailable(): boolean {
  return getPodversePerfProbeModule() !== null;
}
