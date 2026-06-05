import { normalizeApiRequestPath } from './apiRequestPath.js';

/**
 * API path prefixes for catalog content parsed from third-party RSS/feeds.
 * Used to treat 404 Not Found as an expected client outcome (stale links, missing ids).
 */
export const FEED_CONTENT_API_PATH_PREFIXES = [
  '/category',
  '/channel',
  '/feed',
  '/item',
  '/item-chapter',
  '/item-soundbite',
  '/item-transcript',
  '/live-item',
  '/podroll',
  '/publisher-feed',
] as const;

export function isFeedContentApiPath(path: string): boolean {
  const normalized = normalizeApiRequestPath(path);
  return FEED_CONTENT_API_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}
