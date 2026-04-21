import { describe, expect, it } from 'vitest';

import { validateOutboundFetchUrl } from '@podverse/helpers-requests';

/**
 * Ensures the parser workspace resolves outbound policy from helpers-requests (same guardrails as RSS/chapter fetches).
 */
describe('parser outbound guardrails dependency', () => {
  it('blocks loopback before any HTTP client runs', async () => {
    await expect(validateOutboundFetchUrl('http://127.0.0.1/podcast.xml')).rejects.toThrow();
  });

  it('allows public literal IPs used for smoke checks', async () => {
    await expect(validateOutboundFetchUrl('http://1.1.1.1/rss')).resolves.toBeUndefined();
  });
});
