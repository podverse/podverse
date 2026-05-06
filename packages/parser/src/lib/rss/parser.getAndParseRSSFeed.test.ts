import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../_request.js', () => ({
  _request: vi.fn(),
}));

vi.mock('podverse-partytime', () => ({
  parseFeed: vi.fn(),
}));

import { parseFeed } from 'podverse-partytime';

import { _request } from '../_request.js';
import { getAndParseRSSFeed } from './parser.js';

describe('getAndParseRSSFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parsed feed when request and parser succeed', async () => {
    const mockParsedFeed = {
      title: 'Example Podcast',
      items: [],
    };

    vi.mocked(_request).mockResolvedValue({ data: '<rss></rss>' });
    vi.mocked(parseFeed).mockReturnValue(mockParsedFeed);

    await expect(getAndParseRSSFeed('https://example.com/feed.xml', 9999)).resolves.toEqual(
      mockParsedFeed
    );
    expect(_request).toHaveBeenCalledWith('https://example.com/feed.xml', {
      maxResponseBytes: 9999,
    });
    expect(parseFeed).toHaveBeenCalledWith('<rss></rss>', {
      allowMissingGuid: true,
      maxFeedBodyBytes: 9999,
    });
  });

  it('throws when parser returns no feed object', async () => {
    vi.mocked(_request).mockResolvedValue({ data: '<rss></rss>' });
    vi.mocked(parseFeed).mockReturnValue(null);

    await expect(getAndParseRSSFeed('https://example.com/feed.xml', 12345)).rejects.toThrow(
      'getAndParseRSSFeed: parsedFeed not found for https://example.com/feed.xml'
    );
  });

  it('throws when body exceeds max bytes and parseFeed returns null', async () => {
    const body = 'x'.repeat(100);
    vi.mocked(_request).mockResolvedValue({ data: body });
    vi.mocked(parseFeed).mockReturnValue(null);

    await expect(getAndParseRSSFeed('https://example.com/feed.xml', 50)).rejects.toThrow(
      'getAndParseRSSFeed: response body exceeds max (100 > 50) for https://example.com/feed.xml'
    );
  });
});
