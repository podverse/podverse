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

import {
  markFeedParseFailureRecorded,
  recordFeedParseFailure,
  wasFeedParseFailureRecorded,
} from './recordFeedParseFailure.js';

const feed = { id: 51 } as import('@podverse/orm').Feed;

describe('recordFeedParseFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    feedLogGetMock.mockResolvedValue({ parse_errors: 4 });
    feedLogUpdateMock.mockResolvedValue({});
  });

  it('writes the failure reason with the count and time', async () => {
    await recordFeedParseFailure(feed, new FeedLogService(), {
      last_http_status: 500,
      last_parse_failure_reason: 'http_5xx',
    });

    expect(feedLogUpdateMock).toHaveBeenCalledWith(feed, {
      last_http_status: 500,
      last_parse_failure_reason: 'http_5xx',
      parse_errors: 5,
      last_failed_parse_time: expect.any(Date),
    });
  });

  it('increments the cut-off counter only for response_truncated', async () => {
    feedLogGetMock.mockResolvedValue({
      parse_errors: 1,
      consecutive_truncation_failures: 2,
    });

    await recordFeedParseFailure(feed, new FeedLogService(), {
      last_parse_failure_reason: 'response_truncated',
    });

    expect(feedLogUpdateMock).toHaveBeenCalledWith(feed, {
      last_parse_failure_reason: 'response_truncated',
      parse_errors: 2,
      last_failed_parse_time: expect.any(Date),
      consecutive_truncation_failures: 3,
    });
  });

  it('starts parse_errors at 1 when feed log row is missing', async () => {
    feedLogGetMock.mockResolvedValue(null);

    await recordFeedParseFailure(feed, new FeedLogService(), {
      last_parse_failure_reason: 'parse_error',
    });

    expect(feedLogUpdateMock).toHaveBeenCalledWith(feed, {
      last_parse_failure_reason: 'parse_error',
      parse_errors: 1,
      last_failed_parse_time: expect.any(Date),
    });
  });

  it('sees a recorded failure through a wrapped cause', () => {
    const original = new Error('too many length or distance symbols');
    markFeedParseFailureRecorded(original);
    const wrapped = new Error(`Unknown Error: ${original.message}`);
    wrapped.cause = original;

    expect(wasFeedParseFailureRecorded(wrapped)).toBe(true);
    expect(wasFeedParseFailureRecorded(new Error('other'))).toBe(false);
  });
});
