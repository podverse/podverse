import { describe, expect, it } from 'vitest';

import { parsePodcastIndexClientOptionsFromEnv } from './podcastIndexClientOptions.js';

describe('parsePodcastIndexClientOptionsFromEnv', () => {
  it('parses optional retry and rate-limit env vars when valid', () => {
    expect(
      parsePodcastIndexClientOptionsFromEnv({
        PODCAST_INDEX_API_RATE_LIMIT_DELAY: '200',
        PODCAST_INDEX_API_MAX_RETRIES: '5',
        PODCAST_INDEX_API_RETRY_BASE_DELAY_MS: '1500',
      })
    ).toEqual({
      rateLimitDelay: 200,
      maxRetries: 5,
      retryBaseDelayMs: 1500,
    });
  });

  it('omits invalid or zero values', () => {
    expect(
      parsePodcastIndexClientOptionsFromEnv({
        PODCAST_INDEX_API_RATE_LIMIT_DELAY: '0',
        PODCAST_INDEX_API_MAX_RETRIES: 'not-a-number',
        PODCAST_INDEX_API_RETRY_BASE_DELAY_MS: '-1',
      })
    ).toEqual({});
  });
});
