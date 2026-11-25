import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

test.describe('Music off library medium chips', () => {
  test('When Music is off and history has no music, History has no medium tabs.', async ({
    page,
  }, testInfo) => {
    await page.goto('/history');
    await expect(page).toHaveURL(/\/history$/);
    const heading = page
      .locator('[data-appearance="web"]')
      .getByRole('heading', { level: 1, name: 'History' });
    await expect(heading).toBeVisible();
    await expect(page.getByRole('button', { name: 'Music', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Podcasts', exact: true })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'History lists podcast history with no medium tabs when Music is off and history has no music.',
      heading
    );
  });

  test('When Music is off and the music queue has no rows, Queues has no medium tabs.', async ({
    page,
  }, testInfo) => {
    await page.goto('/queues');
    await expect(page).toHaveURL(/\/queues$/);
    const heading = page
      .locator('[data-appearance="web"]')
      .getByRole('heading', { level: 1, name: 'Queues' });
    await expect(heading).toBeVisible();
    await expect(page.getByRole('button', { name: 'Music', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Podcasts', exact: true })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'Queues lists the podcast queue with no medium tabs when Music is off and the music queue has no rows.',
      heading
    );
  });

  test('When Music is off and the public playlist list has no music playlist, the filter has All and Podcasts.', async ({
    page,
  }, testInfo) => {
    await page.goto('/playlists');
    await expect(page).toHaveURL(/\/playlists$/);
    await expect(page.getByRole('heading', { name: 'Playlists', exact: true })).toBeVisible();

    await page.getByTestId('playlists-medium-button').click();
    const allItem = page.getByRole('menuitemradio', { name: 'All', exact: true });
    await expect(allItem).toBeVisible();
    await expect(page.getByRole('menuitemradio', { name: 'Podcasts', exact: true })).toBeVisible();
    await expect(page.getByRole('menuitemradio', { name: 'Music', exact: true })).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'The playlists filter offers All and Podcasts when the public list has no music playlist.',
      allItem
    );
  });
});
