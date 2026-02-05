export const getDedupeTTLSeconds = (dedupeCacheTimeMS: number | null): number | null => {
  if (!dedupeCacheTimeMS || dedupeCacheTimeMS <= 0) {
    return null;
  }
  return Math.ceil(dedupeCacheTimeMS / 1000);
};
