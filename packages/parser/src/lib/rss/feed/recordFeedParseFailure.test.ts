import { beforeEach, describe, expect, it, vi } from 'vitest';

const feedLogGetMock = vi.fn();
const feedLogUpdateMock = vi.fn();

vi.mock('@podverse/orm', () => ({
  FeedLogService: class FeedLogService {
    get = feedLogGetMock;
    update = feedLogUpdateMock;
  },
}));

import { FeedLogService } from '@podverse/orm';

import { recordFeedParseFailure } from './recordFeedParseFailure.js';

const feed = { id: 51 } as import('@podverse/orm').Feed;

describe('recordFeedParseFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    feedLogGetMock.mockResolvedValue({ parse_errors: 4 });
    feedLogUpdateMock.mockResolvedValue({});
  });

  it('increments parse_errors and sets last_failed_parse_time', async () => {
    await recordFeedParseFailure(feed, new FeedLogService(), {
      last_http_status: 500,
    });

    expect(feedLogUpdateMock).toHaveBeenCalledWith(feed, {
      last_http_status: 500,
      parse_errors: 5,
      last_failed_parse_time: expect.any(Date),
    });
  });

  it('starts parse_errors at 1 when feed log row is missing', async () => {
    feedLogGetMock.mockResolvedValue(null);

    await recordFeedParseFailure(feed, new FeedLogService());

    expect(feedLogUpdateMock).toHaveBeenCalledWith(feed, {
      parse_errors: 1,
      last_failed_parse_time: expect.any(Date),
    });
  });
});
