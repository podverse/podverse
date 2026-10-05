import { describe, expect, it } from 'vitest';

import { buildErrorReportMailto } from './errorLogMailto';

const input = {
  email: 'contact@podverse.fm',
  overflowBody: 'Paste the report.',
  report: 'line one\nline two',
  subject: 'Error report: home_feed_read_failed',
};

describe('buildErrorReportMailto', () => {
  it('puts a short report in the message body', () => {
    const result = buildErrorReportMailto(input);
    expect(result).toEqual({
      includesReport: true,
      url: `mailto:contact@podverse.fm?subject=${encodeURIComponent(input.subject)}&body=${encodeURIComponent(input.report)}`,
    });
  });

  it('uses the overflow note when the report would make the URL too long', () => {
    const result = buildErrorReportMailto({
      ...input,
      email: 'a@b.co',
      maxUrlLength: 80,
      report: 'x'.repeat(500),
    });
    expect(result).toEqual({
      includesReport: false,
      url: `mailto:a@b.co?subject=${encodeURIComponent(input.subject)}&body=${encodeURIComponent(input.overflowBody)}`,
    });
  });

  it('rejects an address that is not a single mailbox', () => {
    expect(buildErrorReportMailto({ ...input, email: 'not an email' })).toBeNull();
    expect(buildErrorReportMailto({ ...input, email: '   ' })).toBeNull();
    expect(buildErrorReportMailto({ ...input, email: 'a@b.co?bcc=evil@x.com' })).toBeNull();
  });
});
