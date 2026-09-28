/**
 * Serializes the first expo-image `Image.loadAsync` so Swift's lazy `ImageLoader.imageManager`
 * finishes initializing before any parallel thumbnail loads share it. Concurrent product loads
 * wait on that warmup, then run together.
 */

export type ImageLoaderInitGate = {
  afterReady: <T>(work: () => Promise<T>) => Promise<T>;
  ensureReady: () => Promise<void>;
};

export function createImageLoaderInitGate(warm: () => Promise<void>): ImageLoaderInitGate {
  let ready: Promise<void> | null = null;

  const ensureReady = (): Promise<void> => {
    if (ready === null) {
      // A failed warmup still opens the gate: product loads must retry their own URLs.
      ready = warm().then(
        () => undefined,
        () => undefined
      );
    }
    return ready;
  };

  return {
    ensureReady,
    afterReady: async <T>(work: () => Promise<T>): Promise<T> => {
      await ensureReady();
      return work();
    },
  };
}
