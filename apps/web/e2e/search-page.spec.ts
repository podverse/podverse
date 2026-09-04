import { expect, test } from '@playwright/test';

import { actionAndCapture, capturePageLoad } from './helpers/stepScreenshots';

test.describe('Search page', () => {
  test('When a visitor opens Search, they see All and Music chips under the field and can search the Podcast Index.', async ({
    page,
  }, testInfo) => {
    await page.goto('/search');
    await expect(page).toHaveURL(/\/search\/?$/);

    const heading = page.getByRole('heading', { name: 'Search' });
    const searchField = page.getByLabel('Search by title...');
    const allChip = page.getByRole('button', { name: 'All' });
    const musicChip = page.getByRole('button', { name: 'Music' });

    await expect(heading).toBeVisible();
    await expect(searchField).toBeVisible();
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
  });
});
