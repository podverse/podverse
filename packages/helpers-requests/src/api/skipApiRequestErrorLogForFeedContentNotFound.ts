import { isFeedContentApiPath } from './feedContentApiPathPrefixes.js';

/**
 * Missing feed-parsed catalog resources (episodes, chapters, channels, etc.) return HTTP 404.
 * Those responses are expected when links are stale or ids do not exist; do not log as API errors.
 */
export function skipApiRequestErrorLogForFeedContentNotFound(
  errorInfo: { status?: number },
  requestPath: string
): boolean {
  return errorInfo.status === 404 && isFeedContentApiPath(requestPath);
}
