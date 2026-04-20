/**
 * Redis/cache key for Add-by-RSS parse status entries.
 * Format must stay byte-identical across API and workers.
 */
export function buildAddByRSSParseCacheKey(requestId: string): string {
  return `addByRSS:parse:${requestId}`;
}
