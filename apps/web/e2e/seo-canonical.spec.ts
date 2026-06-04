import { expect, test } from '@playwright/test';

import { E2E_PODCAST_CHANNEL_ID_TEXT } from './helpers/seedConstants';
import { expectCanonical, fetchSsrHtml } from './helpers/seoHtml';

test.describe('Web SEO canonical URL', () => {
  test('podcast detail canonical omits query parameters', async ({ request }) => {
    const html = await fetchSsrHtml(
      request,
      `/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}?page=2&type=episodes`
    );

    expectCanonical(html, `http://localhost:4032/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
    expect(html).not.toContain(
      `href="http://localhost:4032/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}?page=2&type=episodes"`
    );
    expect(html).toContain('<link rel="canonical"');
  });
});
