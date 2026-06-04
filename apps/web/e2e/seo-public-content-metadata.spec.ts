import { expect, test } from '@playwright/test';

import {
  E2E_MUSIC_TRACK_ONE_ID_TEXT,
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
} from './helpers/seedConstants';
import { expectMetaDescriptionContains, fetchSsrHtml } from './helpers/seoHtml';

test.describe('Web SEO public content metadata', () => {
  test('SSR HTML includes entity titles and feed-derived descriptions for public podcast content', async ({
    request,
  }) => {
    await test.step('Fetch the seeded public podcast channel HTML and assert metadata contract.', async () => {
      const html = await fetchSsrHtml(request, `/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
      expect(html).toContain('<title>E2E Podcast Seed Channel');
      expectMetaDescriptionContains(html, 'E2E seeded channel for deterministic media-player podcast tests.');
      expect(html).not.toMatch(/name=["']robots["'][^>]*noindex/i);
    });

    await test.step('Fetch the seeded public podcast episode HTML and assert feed-description metadata.', async () => {
      const html = await fetchSsrHtml(request, `/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
      expect(html).toContain('<title>E2E Podcast Resume P > 0');
      expectMetaDescriptionContains(html, 'deterministic E2E media-player fixture');
      expect(html).not.toMatch(/name=["']robots["'][^>]*noindex/i);
    });

    await test.step('Fetch the seeded public music track HTML and assert feed-description metadata.', async () => {
      const html = await fetchSsrHtml(request, `/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
      expect(html).toContain('<title>E2E Music Track One');
      expectMetaDescriptionContains(html, 'deterministic E2E music fixture');
      expect(html).not.toMatch(/name=["']robots["'][^>]*noindex/i);
    });
  });
});
