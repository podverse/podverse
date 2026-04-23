import { describe, expect, it } from 'vitest';

import { summarizeUpstreamHttpErrorForLog } from './summarizeUpstreamHttpErrorForLog.js';

describe('summarizeUpstreamHttpErrorForLog', () => {
  it('includes HTTP status, endpoint class, and correlation id — never upstream response payloads', () => {
    const errorLike = {
      message: 'Request failed with status code 502',
      code: 'ERR_BAD_RESPONSE',
      response: {
        status: 502,
        data: {
          leakedSecret: 'SUPER_SECRET_DO_NOT_LOG',
          bodyField: ['nested', 'structure'],
        },
        headers: {
          'x-request-id': 'req-abc',
        },
      },
      config: {
        url: 'https://api.example.com/v1/feeds/bytag?token=should-not-appear',
        method: 'GET',
      },
    };

    const summary = summarizeUpstreamHttpErrorForLog(errorLike);

    expect(summary.httpStatus).toBe(502);
    expect(summary.correlationId).toBe('req-abc');
    expect(summary.method).toBe('GET');
    expect(summary.endpointHost).toBe('api.example.com');
    expect(summary.endpointPath).toBe('/v1/feeds/bytag');
    expect(summary.message).toBe('Request failed with status code 502');
    expect(summary.code).toBe('ERR_BAD_RESPONSE');

    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('SUPER_SECRET_DO_NOT_LOG');
    expect(serialized).not.toContain('should-not-appear');
    expect(serialized).not.toContain('token=');
  });

  it('uses context.requestUrl when axios config url is missing', () => {
    const summary = summarizeUpstreamHttpErrorForLog(
      { message: 'fail', response: { status: 404 } },
      { requestUrl: 'https://podcastindex.org/api/search?q=test' }
    );

    expect(summary.endpointHost).toBe('podcastindex.org');
    expect(summary.endpointPath).toBe('/api/search');
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('q=test');
  });
});
