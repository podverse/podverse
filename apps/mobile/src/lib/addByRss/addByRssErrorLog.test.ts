import { describe, expect, it } from 'vitest';

import {
  ADD_BY_RSS_PARSE_FAILED_CODE,
  ADD_BY_RSS_PARSE_PENDING_CODE,
  ADD_BY_RSS_PAYLOAD_UNMAPPED_CODE,
  buildAddByRssAddErrorLog,
  buildAddByRssParseFailureLog,
} from './addByRssErrorLog';

const FEED_URL = 'https://host.example/feed.xml';

const parseInput = (
  status: 'failed' | 'not_modified' | 'parsed' | 'pending',
  serverError: string | null = null
) => ({
  feedUrl: FEED_URL,
  jobKind: 'add-by-rss-add',
  occurredAt: 1000,
  requestId: 'req-1',
  result: { mappedFeed: null, serverError, status },
});

describe('buildAddByRssParseFailureLog', () => {
  it('names the feed and the host status when the server could not fetch it', () => {
    expect(
      buildAddByRssParseFailureLog(parseInput('failed', 'Request failed with status code 404'))
    ).toEqual({
      details: {
        feed_url: FEED_URL,
        http_status: '404',
        parse_status: 'failed',
        request_id: 'req-1',
      },
      errorCode: ADD_BY_RSS_PARSE_FAILED_CODE,
      jobKind: 'add-by-rss-add',
      message: 'Request failed with status code 404',
      occurredAt: 1000,
      outcome: 'failure',
    });
  });

  it('keeps a failure without a status or reason', () => {
    const entry = buildAddByRssParseFailureLog(parseInput('failed'));
    expect(entry?.errorCode).toBe(ADD_BY_RSS_PARSE_FAILED_CODE);
    expect(entry?.details?.http_status).toBeUndefined();
    expect(entry?.message).toBeNull();
  });

  it('records a parse that never resolved and a payload that could not be read', () => {
    expect(buildAddByRssParseFailureLog(parseInput('pending'))?.errorCode).toBe(
      ADD_BY_RSS_PARSE_PENDING_CODE
    );
    expect(buildAddByRssParseFailureLog(parseInput('parsed'))?.errorCode).toBe(
      ADD_BY_RSS_PAYLOAD_UNMAPPED_CODE
    );
  });

  it('writes nothing for an unchanged feed', () => {
    expect(buildAddByRssParseFailureLog(parseInput('not_modified'))).toBeNull();
  });
});

describe('buildAddByRssAddErrorLog', () => {
  it('records an API rejection with its code and the feed URL', () => {
    const error = {
      message: 'Request failed with status code 500',
      response: { data: {}, status: 500 },
    };
    expect(buildAddByRssAddErrorLog(error, FEED_URL, 2000)).toEqual({
      details: { feed_url: FEED_URL },
      errorCode: 'http_500',
      jobKind: 'add-by-rss-add',
      message: 'Request failed with status code 500',
      occurredAt: 2000,
      outcome: 'failure',
    });
  });

  it('records being offline as skipped, not as a failure', () => {
    const entry = buildAddByRssAddErrorLog(new Error('Network Error'), FEED_URL, 2000);
    expect(entry.outcome).toBe('skipped');
    expect(entry.errorCode).toBe('network_unreachable');
  });
});
