import { expect, test } from '@playwright/test';

import { E2E_CATALOG_OFF_LIST_PODCAST_CHANNEL_ID_TEXT } from './helpers/catalogRestricted';
import {
  E2E_MUSIC_ALBUM_TITLE,
  E2E_PODCAST_CHANNEL_ID_TEXT,
  E2E_PODCAST_CHANNEL_TITLE,
  EMBED_SAMPLE_PODCAST_CHANNEL_TITLE,
} from './helpers/seedConstants';
import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

test.describe('Catalog-restricted search', () => {
  test('When the allowlist is set, searching a stored show that is off the list finds it and opens its show page.', async ({
    page,
  }, testInfo) => {
    await page.goto('/search');
    await expect(page).toHaveURL(/\/search\/?$/);

    const searchField = page.getByLabel('Search by Title...');
    await expect(searchField).toBeVisible();
    await capturePageLoad(page, testInfo, 'Search is open with the title field.', searchField);

    const showLink = page.getByRole('link').filter({ hasText: EMBED_SAMPLE_PODCAST_CHANNEL_TITLE });
    await actionAndCapture(
      page,
      testInfo,
      'Searching a stored show off the allowlist lists it as a link to its show page.',
      async () => {
        await searchField.fill(EMBED_SAMPLE_PODCAST_CHANNEL_TITLE);
        await expect(showLink).toBeVisible();
        await expect(showLink).toHaveAttribute(
          'href',
          `/podcast/${E2E_CATALOG_OFF_LIST_PODCAST_CHANNEL_ID_TEXT}`
        );
        await expect(page.locator('a[href^="/podcast-index/feed/"]')).toHaveCount(0);
      },
      showLink
    );
  });

  test("When the allowlist is set, searching an allowlisted show's title opens its show page.", async ({
    page,
  }, testInfo) => {
    await page.goto('/search');
    await expect(page).toHaveURL(/\/search\/?$/);

    const searchField = page.getByLabel('Search by Title...');
    await expect(searchField).toBeVisible();
    await capturePageLoad(page, testInfo, 'Search is open with the title field.', searchField);

    const showLink = page.getByRole('link').filter({ hasText: E2E_PODCAST_CHANNEL_TITLE });
    await actionAndCapture(
      page,
      testInfo,
      'Searching an allowlisted show lists it as a link to its show page.',
      async () => {
        await searchField.fill('E2E Podcast Seed');
        await expect(showLink).toBeVisible();
        await expect(showLink).toHaveAttribute('href', `/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`);
      },
      showLink
    );
  });

  test('When the allowlist is set, Search does not ask the Podcast Index.', async ({
    page,
  }, testInfo) => {
    await page.goto('/search');
    await expect(page).toHaveURL(/\/search\/?$/);

    const searchField = page.getByLabel('Search by Title...');
    await expect(searchField).toBeVisible();
    await capturePageLoad(page, testInfo, 'Search is open with the title field.', searchField);

    const noResults = page.getByText('No Results Found');
    await actionAndCapture(
      page,
      testInfo,
      'The Podcast Index fixture term finds nothing while the allowlist is set.',
      async () => {
        await searchField.fill('unparsedfixture');
        await expect(noResults).toBeVisible();
        await expect(page.getByText('E2E Unparsed Podcast Index Feed')).toHaveCount(0);
      },
      noResults
    );
  });

  test("When Music is off, searching a music album's title finds nothing.", async ({
    page,
  }, testInfo) => {
    await page.goto('/search');
    await expect(page).toHaveURL(/\/search\/?$/);

    const searchField = page.getByLabel('Search by Title...');
    await expect(searchField).toBeVisible();
    await capturePageLoad(page, testInfo, 'Search is open with the title field.', searchField);

    const noResults = page.getByText('No Results Found');
    await actionAndCapture(
      page,
      testInfo,
      'Searching a music album title finds nothing while Music is off.',
      async () => {
        await searchField.fill(E2E_MUSIC_ALBUM_TITLE);
        await expect(noResults).toBeVisible();
      },
      noResults
    );
  });
});
