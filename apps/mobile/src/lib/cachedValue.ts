/**
 * Whether a cache-first screen should replace what it already painted.
 *
 * First paint comes from the device. A later server copy only updates React state when the
 * payload actually differs, so an identical refresh does not re-render.
 */
export const shouldReplaceCachedValue = <T>(cached: T | null, fresh: T): boolean => {
  if (cached === null) {
    return true;
  }

  return JSON.stringify(cached) !== JSON.stringify(fresh);
};
