import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAndParseRSSFeedMock = vi.fn();
const feedLogUpdateMock = vi.fn();
const recordFeedParseFailureMock = vi.fn();

vi.mock('@parser/factories/timerManager.js', () => ({
  timerManager: {
    start: vi.fn(),
    end: vi.fn(),
  },
}));

vi.mock('../parser.js', () => ({
  getAndParseRSSFeed: getAndParseRSSFeedMock,
}));

vi.mock('./recordFeedParseFailure.js', () => ({
  recordFeedParseFailure: recordFeedParseFailureMock,
}));

vi.mock('@podverse/orm', () => ({
  FeedLogService: class FeedLogService {
    update = feedLogUpdateMock;
  },
}));

vi.mock('@podverse/helpers-requests', () => ({
  getStatusCodeFromError: vi.fn(() => null),
  throwRequestError: vi.fn((error: unknown) => {
    throw error;
  }),
}));

import { handleRequestRSSFeed } from './feed.js';

const feed = {
  id: 12,
  url: 'https://example.com/feed.xml',
} as import('@podverse/orm').Feed;

describe('handleRequestRSSFeed empty parsed feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    feedLogUpdateMock.mockResolvedValue({});
    recordFeedParseFailureMock.mockResolvedValue(undefined);
  });

  it('records parse failure instead of last_finished_parse_time when parsed feed is empty', async () => {
    getAndParseRSSFeedMock.mockResolvedValue(null);

    await expect(handleRequestRSSFeed(feed, 10_000_000)).rejects.toThrow(
      'parsedFeed no data found'
    );

    expect(recordFeedParseFailureMock).toHaveBeenCalledWith(feed, expect.any(Object), {
      last_http_status: 200,
    });
    expect(feedLogUpdateMock).not.toHaveBeenCalledWith(
      feed,
      expect.objectContaining({ last_finished_parse_time: expect.any(Date) })
    );
  });
});
