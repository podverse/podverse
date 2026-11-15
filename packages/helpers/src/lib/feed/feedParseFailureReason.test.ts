import { describe, expect, it } from 'vitest';

import {
  FEED_PARSE_FAILURE_REASONS,
  isPermanentFeedParseFailure,
} from './feedParseFailureReason.js';

const PERMANENT = new Set(['http_404', 'http_410', 'dns_not_found', 'not_a_feed', 'no_feed_url']);

describe('isPermanentFeedParseFailure', () => {
  it('is true only for failures another fetch of the same URL will not repair', () => {
    expect(isPermanentFeedParseFailure(null)).toBe(false);
    for (const reason of FEED_PARSE_FAILURE_REASONS) {
      expect(isPermanentFeedParseFailure(reason)).toBe(PERMANENT.has(reason));
    }
  });
});
