/**
 * Keyed in-flight guard for taps that write to the network or storage. A second call with the same
 * key while the first is still running resolves `false` immediately; the key is released when the
 * work settles (including on throw).
 */

export type InFlightGuard = {
  run: <T>(key: string, work: () => Promise<T>) => Promise<T | false>;
};

export function createInFlightGuard(): InFlightGuard {
  const inflight = new Set<string>();

  return {
    run: async <T>(key: string, work: () => Promise<T>): Promise<T | false> => {
      if (inflight.has(key)) {
        return false;
      }
      inflight.add(key);
      try {
        return await work();
      } finally {
        inflight.delete(key);
      }
    },
  };
}
