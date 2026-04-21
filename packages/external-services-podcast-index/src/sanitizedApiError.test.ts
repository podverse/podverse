import { describe, expect, it } from 'vitest';

import { summarizeUpstreamHttpErrorForLog } from '@podverse/helpers-backend';

/**
 * Contract tests for log lines produced by PodcastIndexService on HTTP failures.
 * Implementation lives in helpers-backend; this package asserts URL shapes used here never leak queries.
 */
describe('sanitized Podcast Index upstream errors', () => {
  it('does not include URL query strings in stringified summaries', () => {
    const summary = summarizeUpstreamHttpErrorForLog(
      { message: 'Request failed with status code 502', response: { status: 502 } },
      {
        requestUrl: 'https://api.podcastindex.org/search/byterm?q=secret+search+token&max=25',
      }
    );

    const line = JSON.stringify(summary);
    expect(line).not.toContain('secret');
    expect(line).not.toContain('q=');
    expect(summary.endpointPath).toBe('/search/byterm');
    expect(summary.httpStatus).toBe(502);
  });

  it('surfaces correlation ids when upstream sends them', () => {
    const summary = summarizeUpstreamHttpErrorForLog({
      message: 'failed',
      response: {
        status: 503,
        headers: { 'x-correlation-id': 'corr-podcast-index-1' },
      },
      config: { url: 'https://api.podcastindex.org/recent/data', method: 'get' },
    });

    expect(summary.correlationId).toBe('corr-podcast-index-1');
  });
});
