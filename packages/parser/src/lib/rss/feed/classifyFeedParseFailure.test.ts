import { XMLParser } from 'fast-xml-parser';
import { QueryFailedError } from 'typeorm';
import { describe, expect, it } from 'vitest';

import type { FeedParseFailureReason } from '@podverse/helpers';

import { FeedNotAFeedError } from '../errors.js';
import { classifyFeedParseFailure } from './classifyFeedParseFailure.js';

function htmlFedToXmlParser(): unknown {
  const html = '<html><body><br><p>Not a feed</p></body></html>';
  try {
    new XMLParser().parse(html, true);
  } catch (error) {
    return error;
  }
  throw new Error('XML parser accepted an HTML body');
}

const axios404 = Object.assign(new Error('Request failed with status code 404'), {
  isAxiosError: true,
  code: 'ERR_BAD_REQUEST',
  response: {
    status: 404,
    data: '<html><body>missing</body></html>',
  },
});

const dns = new TypeError('fetch failed');
dns.cause = { code: 'ENOTFOUND', syscall: 'getaddrinfo' };

const aborted = new Error('The operation was aborted');
aborted.name = 'AbortError';

const tls = new Error('write EPROTO SSL routines:tls_validate_record_header:wrong version number');

const pg22003 = Object.assign(new Error('numeric field overflow'), {
  code: '22003',
  routine: 'numeric_in',
});

const pg23505 = Object.assign(new Error('duplicate key value violates unique constraint'), {
  code: '23505',
  routine: '_bt_check_unique',
});

const cases: Array<{ label: string; error: unknown; reason: FeedParseFailureReason }> = [
  { label: 'axios-style 404', error: axios404, reason: 'http_404' },
  { label: 'fetch cause ENOTFOUND', error: dns, reason: 'dns_not_found' },
  { label: 'AbortError', error: aborted, reason: 'timeout' },
  { label: 'TLS protocol error', error: tls, reason: 'tls_error' },
  { label: 'postgres 22003', error: pg22003, reason: 'db_value_out_of_range' },
  { label: 'postgres 23505', error: pg23505, reason: 'db_error' },
  {
    label: 'QueryFailedError 23505',
    error: new QueryFailedError(
      'INSERT',
      [],
      Object.assign(new Error('duplicate key'), { code: '23505' })
    ),
    reason: 'db_error',
  },
  { label: 'HTML body fed to the XML parser', error: htmlFedToXmlParser(), reason: 'not_a_feed' },
  { label: 'plain string', error: 'parser failed', reason: 'unknown' },
  { label: 'typed not-a-feed error', error: new FeedNotAFeedError(), reason: 'not_a_feed' },
  {
    label: 'body too large wins over an HTTP status',
    error: Object.assign(new Error('maxContentLength size of 100 exceeded'), {
      response: { status: 500, data: '<html></html>' },
    }),
    reason: 'body_too_large',
  },
  {
    label: 'wrapped axios 404',
    error: new Error('Unknown Error: Request failed with status code 404', { cause: axios404 }),
    reason: 'http_404',
  },
];

describe('classifyFeedParseFailure', () => {
  it.each(cases)('$label -> $reason', ({ error, reason }) => {
    expect(classifyFeedParseFailure(error)).toBe(reason);
  });
});
