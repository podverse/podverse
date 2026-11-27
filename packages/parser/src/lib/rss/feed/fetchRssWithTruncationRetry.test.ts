import { describe, expect, it, vi } from 'vitest';

import { RSS_CUT_OFF_MIN_BYTES } from '@podverse/helpers';

import { FeedNotAFeedError, FeedResponseTruncatedError } from '../errors.js';
import { fetchRssBodyWithTruncationRetry } from './fetchRssWithTruncationRetry.js';

const url = 'https://example.com/feed.xml';

function cutOffBody(): string {
  return `<rss><channel><title>${'x'.repeat(RSS_CUT_OFF_MIN_BYTES)}</title>`;
}

describe('fetchRssBodyWithTruncationRetry', () => {
  it('returns the body from a later download after a cut-off', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('too many length or distance symbols'), { code: 'Z_DATA_ERROR' })
      )
      .mockResolvedValueOnce('<rss><channel><title>Show</title></channel></rss>');
    const sleep = vi.fn().mockResolvedValue(undefined);

    const body = await fetchRssBodyWithTruncationRetry({
      url,
      maxFeedBodyBytes: 1_000_000,
      request,
      sleep,
    });

    expect(body).toContain('<title>Show</title>');
    expect(request).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it('stops after three cut-off downloads', async () => {
    const request = vi.fn().mockResolvedValue(cutOffBody());
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      fetchRssBodyWithTruncationRetry({
        url,
        maxFeedBodyBytes: 1_000_000,
        request,
        sleep,
      })
    ).rejects.toBeInstanceOf(FeedResponseTruncatedError);

    expect(request).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(2, 8_000);
  });

  it('does not retry a body that is not a feed', async () => {
    const request = vi.fn().mockRejectedValue(new FeedNotAFeedError());
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      fetchRssBodyWithTruncationRetry({
        url,
        maxFeedBodyBytes: 1_000_000,
        request,
        sleep,
      })
    ).rejects.toBeInstanceOf(FeedNotAFeedError);

    expect(request).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
