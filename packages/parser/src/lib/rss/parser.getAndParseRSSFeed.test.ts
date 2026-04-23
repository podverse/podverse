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

    await expect(getAndParseRSSFeed('https://example.com/feed.xml')).resolves.toEqual(
      mockParsedFeed
    );
    expect(_request).toHaveBeenCalledWith('https://example.com/feed.xml');
    expect(parseFeed).toHaveBeenCalledWith('<rss></rss>', { allowMissingGuid: true });
  });

  it('throws when parser returns no feed object', async () => {
    vi.mocked(_request).mockResolvedValue({ data: '<rss></rss>' });
    vi.mocked(parseFeed).mockReturnValue(null);

    await expect(getAndParseRSSFeed('https://example.com/feed.xml')).rejects.toThrow(
      'getAndParseRSSFeed: parsedFeed not found for https://example.com/feed.xml'
    );
  });
});
