import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { loginSeedUser } from './helpers/addByRSSCredentials';
import { capturePageLoad } from './helpers/stepScreenshots';

const chipRow = (page: Page) => page.getByTestId('media-list-chips-items');

const chipButton = (page: Page, name: string) =>
  chipRow(page).getByRole('button', { name, exact: true });

test.describe('Signed-out landing', () => {
  test('A signed-out visit opens Browse on Podcasts, Recent, and grid, and Subscribed stays available', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    await test.step('Opening the site lands on Browse Podcasts, sorted by Recent, in grid', async () => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/browse$/);
      await expect(page.getByRole('heading', { name: 'Browse', exact: true })).toBeVisible();
      await expect(chipButton(page, 'Podcasts')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: 'Sort: Recent' })).toBeVisible();

      await page.getByTestId('view-selector-button').click();
      await expect(
        page.getByRole('menuitemradio', { name: 'Grid View', exact: true })
      ).toHaveAttribute('aria-checked', 'true');
      await page.keyboard.press('Escape');

      await capturePageLoad(
        page,
        testInfo,
        'A signed-out visit opens Browse on Podcasts, sorted by Recent.',
        chipButton(page, 'Podcasts')
      );
    });

    await test.step('Subscribed stays in the sidebar and opens the Subscribed page', async () => {
      const subscribed = page
        .locator('#sidebar a[href="/subscribed"]')
        .filter({ hasText: 'Subscribed' });
      await expect(subscribed).toBeVisible();
      await subscribed.click();
      await expect(page).toHaveURL(/\/subscribed$/);
      await expect(page.getByRole('heading', { name: 'Subscribed', exact: true })).toBeVisible();

      await capturePageLoad(
        page,
        testInfo,
        'Subscribed in the sidebar opens the Subscribed page while signed out.',
        page.getByRole('heading', { name: 'Subscribed', exact: true })
      );
    });
  });

  test('A signed-in visit to the site stays on Subscribed', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginSeedUser(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    const heading = page.getByRole('heading', { name: 'Subscribed', exact: true });
    await expect(heading).toBeVisible();
    await expect(page.locator('#sidebar a[href="/subscribed"]')).toHaveAttribute(
      'aria-current',
      'page'
    );

    await capturePageLoad(page, testInfo, 'A signed-in visit stays on Subscribed.', heading);
  });
});
