import { test } from '@playwright/test';

import {
  E2E_MUSIC_TRACK_ONE_ID_TEXT,
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT,
} from './helpers/seedConstants';
import {
  expectMetaDescriptionContains,
  expectRobotsIndexable,
  expectTitleContains,
  fetchSsrHtml,
} from './helpers/seoHtml';

test.describe('Web SEO public content metadata', () => {
  test('SSR HTML includes entity titles and feed-derived descriptions for public podcast content', async ({
    request,
  }) => {
    await test.step('Fetch the seeded public podcast channel HTML and assert metadata contract.', async () => {
      const html = await fetchSsrHtml(request, `/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
      expectTitleContains(html, 'E2E Podcast Seed Channel');
      expectMetaDescriptionContains(
        html,
        'E2E seeded channel for deterministic media-player podcast tests.'
      );
      expectRobotsIndexable(html);
    });

    await test.step('Fetch the seeded public podcast episode HTML and assert feed-description metadata.', async () => {
      const html = await fetchSsrHtml(request, `/episode/${E2E_PODCAST_ITEM_RESUME_P_POS_ID_TEXT}`);
      expectTitleContains(html, 'E2E Podcast Resume P > 0');
      expectMetaDescriptionContains(html, 'deterministic E2E media-player fixture');
      expectRobotsIndexable(html);
    });

    await test.step('Fetch the seeded public music track HTML and assert feed-description metadata.', async () => {
      const html = await fetchSsrHtml(request, `/track/${E2E_MUSIC_TRACK_ONE_ID_TEXT}`);
      expectTitleContains(html, 'E2E Music Track One');
      expectMetaDescriptionContains(html, 'deterministic E2E music fixture');
      expectRobotsIndexable(html);
    });
  });
});
