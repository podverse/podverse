import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { capturePageLoad } from './helpers/stepScreenshots';

const chipRow = (page: Page) => page.getByTestId('media-list-chips-items');

const chipButton = (page: Page, name: string) =>
  chipRow(page).getByRole('button', { name, exact: true });

test.describe('Music off media list chips', () => {
  test('When Music is off, Home offers Podcasts, Episodes, Clips, and Livestreams.', async ({
    page,
  }, testInfo) => {
    await page.goto('/subscribed');
    await expect(page).toHaveURL('/subscribed');

    const row = chipRow(page);
    await expect(row).toBeVisible();
    await expect(row.getByRole('button')).toHaveText([
      'Podcasts',
      'Episodes',
      'Clips',
      'Livestreams',
    ]);
    await expect(chipButton(page, 'Artists')).toHaveCount(0);
    await expect(chipButton(page, 'Albums')).toHaveCount(0);
    await expect(chipButton(page, 'Tracks')).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'Home offers Podcasts, Episodes, Clips, and Livestreams when Music is off.',
      row
    );
  });

  test('When Music is off, a Home URL that names Artists opens Podcasts.', async ({
    page,
  }, testInfo) => {
    await page.goto('/subscribed?tab=artists');
    await expect(page).toHaveURL(/\/subscribed\?tab=artists$/);

    const podcasts = chipButton(page, 'Podcasts');
    await expect(podcasts).toBeVisible();
    await expect(podcasts).toHaveAttribute('aria-pressed', 'true');
    await expect(chipButton(page, 'Artists')).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'A Home URL that names Artists opens Podcasts when Music is off.',
      podcasts
    );
  });

  test('When Music is off, Browse keeps Playlists and Users and drops the music chips.', async ({
    page,
  }, testInfo) => {
    await page.goto('/browse');
    await expect(page).toHaveURL('/browse');

    const row = chipRow(page);
    await expect(row).toBeVisible();
    await expect(row.getByRole('button')).toHaveText([
      'Podcasts',
      'Episodes',
      'Clips',
      'Livestreams',
      'Playlists',
      'Users',
    ]);
    await expect(chipButton(page, 'Artists')).toHaveCount(0);
    await expect(chipButton(page, 'Albums')).toHaveCount(0);
    await expect(chipButton(page, 'Tracks')).toHaveCount(0);

    await capturePageLoad(
      page,
      testInfo,
      'Browse keeps Playlists and Users and drops the music chips when Music is off.',
      row
    );
  });

  test('When Music is off, Recommendations offers Podcasts only.', async ({ page }, testInfo) => {
    await page.goto('/recommendations');
    await expect(page).toHaveURL('/recommendations');

    const row = chipRow(page);
    await expect(row).toBeVisible();
    await expect(row.getByRole('button')).toHaveText(['Podcasts']);
    await expect(chipButton(page, 'Albums')).toHaveCount(0);
    await expect(chipButton(page, 'Artists')).toHaveCount(0);
    await expect(page.getByText('Log in to use this feature.')).toBeVisible();

    await capturePageLoad(
      page,
      testInfo,
      'Recommendations offers Podcasts only when Music is off.',
      row
    );
  });
});
