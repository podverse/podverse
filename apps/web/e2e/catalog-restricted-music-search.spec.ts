import { expect, test } from '@playwright/test';

import { E2E_MUSIC_ALBUM_TITLE } from './helpers/seedConstants';
import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Music off search', () => {
  test('When Music is off, Search has the title field and no Music facet.', async ({
    page,
  }, testInfo) => {
    await page.goto('/search');
    await expect(page).toHaveURL(/\/search\/?$/);

    const searchField = page.getByLabel('Search by Title...');
    await expect(searchField).toBeVisible();
    await expect(page.getByRole('button', { name: 'Music', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'Search shows the title field and no All or Music facet when Music is off.',
      searchField
    );
  });

  test('When Music is off, searching the seeded album title does not list that album.', async ({
    page,
  }, testInfo) => {
    await page.goto('/search');
    await expect(page).toHaveURL(/\/search\/?$/);

    const searchField = page.getByLabel('Search by Title...');
    await expect(searchField).toBeVisible();

    // The album is allowlisted, so it can show up only after this search returns.
    const searchResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/channel/search/title') && response.request().method() === 'GET'
    );
    await searchField.fill(E2E_MUSIC_ALBUM_TITLE);
    await searchResponse;

    await expect(page.getByText('E2E Music Album')).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'Searching the seeded album title does not list that album when Music is off.',
      searchField
    );
  });
});
