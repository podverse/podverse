import { expect, test } from '@playwright/test';

import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

test.describe('Search page', () => {
  test('When a visitor opens Search, they see All and Music chips under the field and can search the Podcast Index.', async ({
    page,
  }, testInfo) => {
    await page.goto('/search');
    await expect(page).toHaveURL(/\/search\/?$/);

    const heading = page.getByRole('heading', { name: 'Search' });
    const searchField = page.getByLabel('Search by Title...');
    const allChip = page.getByRole('button', { name: 'All' });
    const musicChip = page.getByRole('button', { name: 'Music' });

    await expect(heading).toBeVisible();
    await expect(searchField).toBeVisible();
    await expect(searchField).toBeFocused();
    await expect(allChip).toBeVisible();
    await expect(musicChip).toBeVisible();
    await expect(allChip).toHaveAttribute('aria-pressed', 'true');
    await expect(musicChip).toHaveAttribute('aria-pressed', 'false');
    await capturePageLoad(
      page,
      testInfo,
      'The Search page shows the field and All and Music chips.',
      searchField
    );

    await actionAndCapture(
      page,
      testInfo,
      'Selecting Music marks that chip as pressed.',
      async () => {
        await musicChip.click();
        await expect(musicChip).toHaveAttribute('aria-pressed', 'true');
        await expect(allChip).toHaveAttribute('aria-pressed', 'false');
      },
      musicChip
    );

    await actionAndCapture(
      page,
      testInfo,
      'Selecting All marks that chip as pressed again before the podcast fixture search.',
      async () => {
        await allChip.click();
        await expect(allChip).toHaveAttribute('aria-pressed', 'true');
        await expect(musicChip).toHaveAttribute('aria-pressed', 'false');
      },
      allChip
    );

    const fixtureRow = page.getByText('E2E Unparsed Podcast Index Feed');
    await actionAndCapture(
      page,
      testInfo,
      'Typing the fixture term returns the unparsed feed row.',
      async () => {
        await searchField.fill('unparsedfixture');
        await expect(fixtureRow).toBeVisible();
      },
      fixtureRow
    );

    const clearSearchButton = page.getByRole('button', { name: 'Clear Search', exact: true });
    await actionAndCapture(
      page,
      testInfo,
      'Pressing the X in the search field clears the term and the results.',
      async () => {
        await clearSearchButton.click();
        await expect(searchField).toHaveValue('');
        await expect(searchField).toBeFocused();
        await expect(fixtureRow).toHaveCount(0);
        await expect(clearSearchButton).toHaveCount(0);
      },
      searchField
    );
  });

  test('When a visitor returns to Search with the browser Back button, the field is not focused.', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    const sidebar = page.locator('#sidebar');
    await sidebar.getByRole('link', { name: 'Search' }).click();
    await expect(page).toHaveURL(/\/search\/?$/);
    const searchField = page.getByLabel('Search by Title...');
    await expect(searchField).toBeFocused();

    await sidebar.getByRole('link', { name: 'Browse' }).click();
    await page.goBack();
    await expect(page).toHaveURL(/\/search\/?$/);
    await expect(searchField).not.toBeFocused();

    await sidebar.getByRole('link', { name: 'Browse' }).click();
    await sidebar.getByRole('link', { name: 'Search' }).click();
    await expect(searchField).toBeFocused();
  });
});
