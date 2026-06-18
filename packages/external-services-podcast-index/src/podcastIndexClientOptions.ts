import { parseOptionalNonNegativeInt } from '@podverse/helpers';

export const PODCAST_INDEX_DEFAULT_MAX_RETRIES = 3;
export const PODCAST_INDEX_DEFAULT_RETRY_BASE_DELAY_MS = 5000;

export type PodcastIndexClientOptions = {
  maxRetries?: number;
  retryBaseDelayMs?: number;
  rateLimitDelay?: number;
};

type PodcastIndexClientEnv = {
  PODCAST_INDEX_API_MAX_RETRIES?: string;
  PODCAST_INDEX_API_RETRY_BASE_DELAY_MS?: string;
  PODCAST_INDEX_API_RATE_LIMIT_DELAY?: string;
};

export function parsePodcastIndexClientOptionsFromEnv(
  env: PodcastIndexClientEnv
): PodcastIndexClientOptions {
  const rateLimitDelay = parseOptionalNonNegativeInt(env.PODCAST_INDEX_API_RATE_LIMIT_DELAY);
  const maxRetries = parseOptionalNonNegativeInt(env.PODCAST_INDEX_API_MAX_RETRIES);
  const retryBaseDelayMs = parseOptionalNonNegativeInt(env.PODCAST_INDEX_API_RETRY_BASE_DELAY_MS);

  return {
    ...(rateLimitDelay !== undefined && rateLimitDelay > 0 && { rateLimitDelay }),
    ...(maxRetries !== undefined && { maxRetries }),
    ...(retryBaseDelayMs !== undefined && retryBaseDelayMs > 0 && { retryBaseDelayMs }),
  };
}
