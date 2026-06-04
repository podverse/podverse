import { expect, test } from '@playwright/test';

import { expectMetaDescriptionContains, fetchSsrHtml } from './helpers/seoHtml';

test.describe('Web SEO static page metadata', () => {
  test('SSR HTML for curated pages uses i18n SEO copy and not feed descriptions', async ({ request }) => {
    await test.step('Fetch home page SSR HTML and assert curated home metadata.', async () => {
      const html = await fetchSsrHtml(request, '/');
      expect(html).toContain('<title>PodverseE2E');
      expectMetaDescriptionContains(
        html,
        'Discover podcasts, music, and livestreams on PodverseE2E.'
      );
      expect(html).not.toContain('E2E seeded channel for deterministic media-player podcast tests.');
    });

    await test.step('Fetch podcasts page SSR HTML and assert curated podcasts metadata.', async () => {
      const html = await fetchSsrHtml(request, '/podcasts');
      expect(html).toContain('<title>Podcasts');
      expectMetaDescriptionContains(html, 'Browse podcast feeds and shows on PodverseE2E.');
      expect(html).not.toContain('E2E seeded channel for deterministic media-player podcast tests.');
    });

    await test.step('Fetch episodes page SSR HTML and assert curated episodes metadata.', async () => {
      const html = await fetchSsrHtml(request, '/episodes');
      expect(html).toContain('<title>Episodes');
      expectMetaDescriptionContains(html, 'Browse podcast episodes across PodverseE2E.');
      expect(html).not.toContain('E2E seeded channel for deterministic media-player podcast tests.');
    });
  });
});
